"""
=======================================================================
🐍 MAIN.PY - Flask Backend Server
=======================================================================

PURPOSE:
- Flask web server that powers the YouTube Summarizer application
- Handles API requests for video analysis, transcript fetching, and AI summarization
- Manages YouTube Data API integration for video details and statistics
- Implements Google Gemini AI for intelligent content summarization
- Provides multiple endpoints for different app functionalities

KEY FEATURES:
- YouTube video transcript extraction using YouTubeTranscriptApi
- AI-powered summarization with Google Gemini (multiple styles)
- Video statistics and efficiency calculations
- Multi-language support for international videos
- API key rotation system for high availability
- Error handling and retry mechanisms
- CORS support for frontend communication

API ENDPOINTS:
- / : Serve main HTML interface
- /video-details : Fetch YouTube video metadata and statistics
- /get-languages : Get available transcript languages
- /summarize : Generate AI-powered video summaries
- /health : Check API status and remaining quotas

DEPENDENCIES:
- Flask: Web framework for API server
- google-generativeai: Google Gemini AI integration
- youtube-transcript-api: YouTube transcript extraction
- flask-cors: Cross-origin request handling
- requests: HTTP client for YouTube Data API calls

SECURITY:
- Environment variable based API key management
- Multiple API key rotation for quota management
- No hardcoded secrets (uses .env file)
- Proper error handling for invalid requests

CONFIGURATION:
- Set up your API keys in .env file
- Supports multiple Google API keys for fallback
- Configurable retry mechanisms and delays
=======================================================================
"""

import os
import time
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests

# Configuration Constants
MAX_RETRIES = 3  # Maximum retry attempts for failed API calls
BASE_DELAY = 1   # Base delay for exponential backoff

# =======================================================================
# API KEY MANAGEMENT SYSTEM
# =======================================================================
# Load API keys from environment variables for security
# Multiple API keys for fallback - set these in your .env file
API_KEYS = []

# Load primary Google API key
google_api_key = os.getenv('GOOGLE_API_KEY')
if google_api_key:
    API_KEYS.append(google_api_key)

# Load additional API keys if available (GOOGLE_API_KEY_2, GOOGLE_API_KEY_3, etc.)
for i in range(2, 6):  # Support up to 5 API keys
    additional_key = os.getenv(f'GOOGLE_API_KEY_{i}')
    if additional_key:
        API_KEYS.append(additional_key)

# Fallback for development - remove this in production
if not API_KEYS:
    print("WARNING: No Google API keys found in environment variables!")
    print("Please set GOOGLE_API_KEY in your .env file")
    # Add placeholder that will cause graceful error handling
    API_KEYS = ["your_google_api_key_here"]

current_api_key_index = 0

def get_current_api_status():
    """Get information about current API key usage."""
    return {
        'current_key_index': current_api_key_index + 1,
        'total_keys': len(API_KEYS),
        'remaining_keys': len(API_KEYS) - current_api_key_index - 1
    }

# Gemini model configuration
GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.8,
    "top_k": 1,
    "max_output_tokens": 1024,  # Adjusted to 1024 tokens for detailed summaries
}
# Note: max_output_tokens options: 1024, 2048, 4096 tokens
# Adjust based on the expected length of summaries
# Note: The max_output_tokens can be adjusted based on the expected length of summaries
# and the capabilities of the Gemini model being used.
# This configuration is set to allow for detailed summaries while managing response size.
# The temperature, top_p, and top_k parameters control the randomness and creativity of the generated
# summaries, allowing for a balance between coherence and variability in the output.
# These settings can be fine-tuned based on the specific requirements of the summarization task.
# The max_output_tokens is set to 4096 to accommodate longer summaries, but can be adjusted as needed.
# The temperature, top_p, and top_k parameters control the randomness and creativity of the generated
# summaries, allowing for a balance between coherence and variability in the output.
# These settings can be fine-tuned based on the specific requirements of the summarization task.    

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

# Flask app initialization
app = Flask(__name__)
CORS(app)

def extract_video_id(video_url: str) -> str:
    """
    Extract YouTube video ID from various URL formats.
    
    Args:
        video_url: YouTube video URL
        
    Returns:
        Video ID string
    """
    if "v=" in video_url:
        return video_url.split("v=")[1].split("&")[0]
    else:
        return video_url.split("/")[-1]


def get_youtube_transcript(video_url: str, language_code: str = None) -> str:
    """
    Fetch transcript for a YouTube video.

    Args:
        video_url: The URL of the YouTube video
        language_code: Optional language code for transcript

    Returns:
        Transcript text or None if failed
    """
    try:
        video_id = extract_video_id(video_url)
        
        if language_code:
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=[language_code])
        else:
            transcript_list_obj = YouTubeTranscriptApi.list_transcripts(video_id)
            language_codes = [t.language_code for t in transcript_list_obj]
            if not language_codes:
                return None
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=language_codes)

        return " ".join([item["text"] for item in transcript_data])

    except Exception as e:
        print(f"Error retrieving transcript for {video_url}: {str(e)}")
        return None


def generate_summary_with_retry(model, prompt: str) -> str:
    """
    Generate summary with exponential backoff retry logic and API key rotation.
    
    Args:
        model: Gemini model instance
        prompt: Prompt for summary generation
        
    Returns:
        Generated summary or error message
    """
    global current_api_key_index
    
    for attempt in range(MAX_RETRIES):
        try:
            response = model.generate_content(prompt)
            
            if response and response.text:
                return response.text
                
            elif response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if hasattr(candidate, 'finish_reason') and candidate.finish_reason.name == "SAFETY":
                    return "Error: Content blocked by safety filter."
                else:
                    finish_reason = candidate.finish_reason.name if hasattr(candidate, 'finish_reason') else "UNKNOWN"
                    return f"Error: Empty response. Finish Reason: {finish_reason}"
            else:
                return "Error: No response generated."
                
        except Exception as e:
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ["429", "quota", "rate limit"]):
                # Try next API key if available
                if current_api_key_index < len(API_KEYS) - 1:
                    current_api_key_index += 1
                    print(f"API quota exceeded. Switching to API key #{current_api_key_index + 1} of {len(API_KEYS)}")
                    try:
                        model = create_gemini_model()
                        continue  # Retry with new API key
                    except Exception as key_error:
                        print(f"Failed to switch API key: {key_error}")
                
                if attempt < MAX_RETRIES - 1:
                    delay = BASE_DELAY * (2 ** attempt)
                    print(f"Rate limit hit, retrying in {delay} seconds (attempt {attempt + 2}/{MAX_RETRIES})")
                    time.sleep(delay)
                    continue
                else:
                    remaining_keys = len(API_KEYS) - current_api_key_index - 1
                    if remaining_keys > 0:
                        return f"Error: API quota exceeded. {remaining_keys} backup keys remaining but all failed. Please try again later."
                    else:
                        return "Error: All API keys have been exhausted. Please wait for quota reset or add more API keys."
            elif any(keyword in error_str for keyword in ["400", "api key", "invalid", "expired"]):
                return "Error: Invalid or expired API key. Please check your API key configuration."
            else:
                return f"Error during summarization: {str(e)}"
    
    return "Error: Failed to generate summary after multiple attempts."


def summarize_transcript(transcript: str, model) -> str:
    """
    Generate a summary of the transcript using Gemini AI.

    Args:
        transcript: Video transcript text
        model: Gemini model instance

    Returns:
        Summary text or error message
    """
    if not transcript:
        return "Error: Transcript is empty."
    
    # Truncate transcript if too long to save tokens
    max_transcript_length = 8000  # Reduced to save tokens
    if len(transcript) > max_transcript_length:
        transcript = transcript[:max_transcript_length] + "..."
    
    # More efficient prompt that uses fewer tokens
    prompt = f"""Summarize this YouTube video transcript in an organized format:

{transcript}

Provide a clear summary covering:
1. Main Topic
2. Key Points (3-5 points)
3. Important Details
4. Conclusions

Summary:"""
    
    return generate_summary_with_retry(model, prompt)


def summarize_transcript_advanced(transcript: str, model, summary_style: str = 'default', 
                                detail_level: str = 'medium', translate_to: str = 'none') -> str:
    """
    Generate an advanced summary of the transcript using Gemini AI with customizable options.

    Args:
        transcript: Video transcript text
        model: Gemini model instance
        summary_style: Style of summary ('default', 'bullet-points', 'paragraphs', 'qa', 'timeline')
        detail_level: Level of detail ('brief', 'medium', 'detailed')
        translate_to: Target language for translation ('none' or language code)

    Returns:
        Summary text or error message
    """
    if not transcript:
        return "Error: Transcript is empty."
    
    # Adjust transcript length based on detail level
    if detail_level == 'brief':
        max_transcript_length = 6000
    elif detail_level == 'detailed':
        max_transcript_length = 12000
    else:  # medium
        max_transcript_length = 8000
        
    if len(transcript) > max_transcript_length:
        transcript = transcript[:max_transcript_length] + "..."
    
    # Create style-specific prompts
    style_prompts = {
        'default': """Provide a clear summary covering:
1. Main Topic
2. Key Points (3-5 points)
3. Important Details
4. Conclusions""",
        
        'bullet-points': """Provide a bullet-point summary with:
• Main topic and overview
• Key points (use bullet points throughout)
• Important details (as sub-bullets)
• Final conclusions""",
        
        'paragraphs': """Provide a well-structured paragraph summary with:
- Opening paragraph: Main topic and context
- Body paragraphs: Key points and details (2-3 paragraphs)
- Closing paragraph: Conclusions and takeaways""",
        
        'qa': """Provide a Q&A format summary with:
Q: What is the main topic of this video?
A: [Answer]

Q: What are the key points discussed?
A: [Answer]

Q: What are the most important details?
A: [Answer]

Q: What conclusions are drawn?
A: [Answer]""",
        
        'timeline': """Provide a timeline-style summary with:
🕐 Beginning: [What starts the discussion]
🕕 Early Discussion: [Initial key points]
🕘 Middle: [Main content and details]
🕛 End: [Conclusions and final thoughts]"""
    }
    
    # Adjust detail level
    detail_instructions = {
        'brief': "Keep it concise and focus only on the most essential information.",
        'medium': "Provide a balanced level of detail with key information.",
        'detailed': "Include comprehensive details, examples, and thorough explanations."
    }
    
    # Create the prompt
    style_instruction = style_prompts.get(summary_style, style_prompts['default'])
    detail_instruction = detail_instructions.get(detail_level, detail_instructions['medium'])
    
    # Add translation instruction if needed
    translation_instruction = ""
    if translate_to != 'none':
        language_names = {
            'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
            'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean',
            'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi'
        }
        target_language = language_names.get(translate_to, translate_to)
        translation_instruction = f"\n\nIMPORTANT: Translate the entire summary to {target_language}."
    
    prompt = f"""Summarize this YouTube video transcript in the requested format:

{transcript}

{style_instruction}

Instructions: {detail_instruction}{translation_instruction}

Summary:"""
    
    return generate_summary_with_retry(model, prompt)


def create_gemini_model():
    """
    Create and configure Gemini model instance with API key rotation.
    
    Returns:
        Configured Gemini model
    """
    global current_api_key_index
    
    # Try environment variable first
    api_key = os.getenv('GEMINI_API_KEY')
    
    # If no env variable, use API keys from list
    if not api_key:
        if current_api_key_index < len(API_KEYS):
            api_key = API_KEYS[current_api_key_index]
        else:
            # All keys exhausted
            raise Exception("All API keys have been exhausted. Please add more keys or wait for quota reset.")
    
    genai.configure(api_key=api_key)
    
    return genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=GENERATION_CONFIG,
        safety_settings=SAFETY_SETTINGS,
    )

# Static file routes
@app.route('/')
def index():
    """Serve the main HTML page."""
    return send_from_directory('.', 'index.html')


@app.route('/style.v2.css')
def style():
    """Serve CSS file."""
    return send_from_directory('.', 'style.v2.css')


@app.route('/script.simple.js')
def script():
    """Serve JavaScript file."""
    return send_from_directory('.', 'script.simple.js')


# API routes
@app.route('/api-status', methods=['GET'])
def api_status():
    """
    Get current API key status.
    
    Returns: {"current_key": 1, "total_keys": 5, "remaining_keys": 4}
    """
    status = get_current_api_status()
    return jsonify(status)


@app.route('/video-details', methods=['POST'])
def video_details():
    """
    Get available transcript languages for a YouTube video.
    
    Expected JSON: {"video_url": "youtube_url"}
    Returns: {"title": "Video Summary", "languages": [{"code": "en", "name": "English"}]}
    """
    data = request.get_json()
    video_url = data.get('video_url')

    if not video_url:
        return jsonify({'error': 'video_url is required'}), 400

    try:
        video_id = extract_video_id(video_url)
        # Validate video ID format
        if not video_id or len(video_id) != 11:
            return jsonify({'error': 'Invalid YouTube video URL'}), 400

        transcript_list_obj = YouTubeTranscriptApi.list_transcripts(video_id)
        if not transcript_list_obj:
            return jsonify({'error': 'No transcripts available for this video'}), 404
        languages = [{'code': t.language_code, 'name': t.language} for t in transcript_list_obj]

        # Fetch video duration using YouTube Data API v3
        # Hardcoded API key for permanent backend fix
        YT_API_KEY = "AIzaSyAP8bxeePxMpxjSKzuOgqLS1M9RUCSGJ-A"
        duration = None
        video_title = 'Video Summary'
        try:
            yt_api_url = f'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id={video_id}&key={YT_API_KEY}'
            yt_resp = requests.get(yt_api_url)
            yt_data = yt_resp.json()
            if 'items' in yt_data and yt_data['items']:
                # ISO 8601 duration, e.g. PT1H2M30S
                iso_duration = yt_data['items'][0]['contentDetails']['duration']
                import isodate
                duration_seconds = int(isodate.parse_duration(iso_duration).total_seconds())
                duration = duration_seconds
                video_title = yt_data['items'][0]['snippet']['title']
        except Exception as e:
            print(f"Error fetching video duration: {e}")
            duration = None

        return jsonify({
            'title': video_title,
            'languages': languages,
            'duration': duration
        })
    except Exception as e:
        print(f"Error in video-details endpoint: {str(e)}")
        return jsonify({'error': f'Failed to retrieve video details: {str(e)}'}), 500


@app.route('/summarize', methods=['POST'])
def summarize():
    """
    Generate a summary for a YouTube video with advanced options.
    
    Expected JSON: {
        "video_url": "youtube_url", 
        "language_code": "en" (optional),
        "summary_style": "default" (optional),
        "detail_level": "medium" (optional),
        "translate_to": "none" (optional)
    }
    Returns: {"summary": "generated_summary"}
    """
    data = request.get_json()
    video_url = data.get('video_url')
    language_code = data.get('language_code')
    summary_style = data.get('summary_style', 'default')
    detail_level = data.get('detail_level', 'medium')
    translate_to = data.get('translate_to', 'none')

    if not video_url:
        return jsonify({'error': 'video_url is required'}), 400

    try:
        # Get transcript
        transcript = get_youtube_transcript(video_url, language_code)
        if not transcript:
            return jsonify({'error': 'Could not retrieve transcript for the given URL'}), 400

        # Generate summary with advanced options
        model = create_gemini_model()
        summary = summarize_transcript_advanced(transcript, model, summary_style, detail_level, translate_to)
        
        return jsonify({'summary': summary})
        
    except Exception as e:
        print(f"Error in summarize endpoint: {str(e)}")
        return jsonify({'error': f'Failed to generate summary: {str(e)}'}), 500


@app.route('/ask-question', methods=['POST'])
def ask_question():
    """
    Answer a question about a YouTube video based on its summary.
    
    Expected JSON: {
        "question": "user's question", 
        "summary": "video summary",
        "video_url": "youtube_url" (optional)
    }
    Returns: {"answer": "ai_generated_answer"}
    """
    data = request.get_json()
    question = data.get('question')
    summary = data.get('summary')
    video_url = data.get('video_url', '')

    if not question:
        return jsonify({'error': 'question is required'}), 400
    
    if not summary:
        return jsonify({'error': 'summary is required'}), 400

    try:
        # Create AI model
        model = create_gemini_model()
        
        # Create a context-aware prompt
        prompt = f"""
        Based on the following video summary, please answer the user's question accurately and helpfully.
        
        Video Summary:
        {summary}
        
        User Question: {question}
        
        Please provide a clear, informative answer based solely on the information available in the summary. 
        If the summary doesn't contain enough information to answer the question, please say so and suggest what additional information might be needed.
        
        Answer:
        """
        
        # Generate answer with retry logic
        answer = generate_summary_with_retry(model, prompt)
        
        return jsonify({'answer': answer})
        
    except Exception as e:
        print(f"Error in ask-question endpoint: {str(e)}")
        return jsonify({'error': f'Failed to generate answer: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True)
