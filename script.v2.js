/*
=======================================================================
⚡ SCRIPT.V2.JS - Enhanced Frontend Application Logic
=======================================================================

PURPOSE:
- Main JavaScript file that powers the frontend functionality
- Handles user interactions, API communications, and dynamic content
- Manages YouTube video processing and AI summarization workflow
- Implements mind map visualization using D3.js library
- Provides responsive UI updates and smooth user experience

KEY FEATURES:
- YouTube URL processing and video ID extraction
- Real-time API communication with Flask backend
- Dynamic language selection for video transcripts
- Interactive mind map generation with D3.js
- Theme switching (dark/light mode) functionality
- Summary export options (PDF, TXT, JSON)
- Statistics dashboard with animated counters
- Responsive error handling and user feedback

MAIN FUNCTIONS:
1. Video Processing:
   - URL validation and video ID extraction
   - Video details fetching from YouTube API
   - Language detection and selection interface

2. AI Summarization:
   - Communication with Gemini AI backend
   - Multiple summary styles (brief, detailed, bullet points)
   - Real-time progress updates during processing

3. Mind Map Visualization:
   - D3.js integration for interactive diagrams
   - Hierarchical data structure rendering
   - Zoom, pan, and expand/collapse functionality

4. UI Management:
   - Theme switching with localStorage persistence
   - Responsive layout adjustments
   - Loading states and progress indicators

5. Data Export:
   - Summary download in multiple formats
   - Mind map export as SVG/PNG
   - Statistics reporting

DEPENDENCIES:
- D3.js: Data visualization library for mind maps
- Modern browser APIs: Fetch, LocalStorage, DOM manipulation
- Backend API: Flask server communication
- CSS: Works with style.v2.css for styling

BROWSER COMPATIBILITY:
- ES6+ features (Arrow functions, Promises, async/await)
- Modern browsers: Chrome, Firefox, Safari, Edge
- Mobile responsive design support
=======================================================================
*/

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // =======================================================================
    // DOM ELEMENT REFERENCES
    // =======================================================================
    // Core interface elements
    const getDetailsBtn = document.getElementById('get-details-btn');
    const summarizeBtn = document.getElementById('summarize-btn');
    const youtubeUrlInput = document.getElementById('youtube-url');
    const summaryText = document.getElementById('summary-text');
    const loader = document.getElementById('loader');
    const videoInfo = document.getElementById('video-info');
    const videoTitle = document.getElementById('video-title');
    const languageSelect = document.getElementById('language-select');
    const summarySection = document.getElementById('summary-section');
    
    // Action buttons and controls
    const copyBtn = document.getElementById('copy-btn');
    const themeSwitch = document.getElementById('checkbox');
    const clearBtn = document.getElementById('clear-btn');
    
    // Mind map visualization elements
    const toggleMindmapBtn = document.getElementById('toggle-mindmap-btn');
    const summaryTextView = document.getElementById('summary-text-view');
    const mindmapView = document.getElementById('mindmap-view');
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const exportMindmapBtn = document.getElementById('export-mindmap-btn');
    const layoutSelect = document.getElementById('layout-select');

    // =======================================================================
    // APPLICATION STATE VARIABLES
    // =======================================================================
    let currentSummary = '';      // Stores the current video summary
    let mindmapData = null;       // Hierarchical data for mind map
    let currentZoom = null;       // D3.js zoom behavior instance
    let currentSvg = null;        // Current SVG element for mind map

    // =======================================================================
    // UTILITY FUNCTIONS
    // =======================================================================
    // Helper function to extract video ID and create embed URL
    function getVideoEmbedUrl(videoUrl) {
        let videoId = '';
        
        if (videoUrl.includes('v=')) {
            videoId = videoUrl.split('v=')[1].split('&')[0];
        } else if (videoUrl.includes('/')) {
            videoId = videoUrl.split('/').pop();
        }
        
        return `https://www.youtube.com/embed/${videoId}`;
    }

    // Helper function to update video preview
    function updateVideoPreview(videoUrl) {
        const videoIframe = document.getElementById('video-iframe');
        const embedUrl = getVideoEmbedUrl(videoUrl);
        videoIframe.src = embedUrl;
    }

    clearBtn.addEventListener('click', () => {
        youtubeUrlInput.value = '';
        videoInfo.classList.add('hidden');
        summarySection.classList.add('hidden');
        summaryText.textContent = '';
        currentSummary = '';
        mindmapData = null;
        // Reset to text view
        summaryTextView.classList.remove('hidden');
        mindmapView.classList.add('hidden');
        toggleMindmapBtn.classList.remove('active');
        // Clear video preview
        const videoIframe = document.getElementById('video-iframe');
        videoIframe.src = '';
    });

    themeSwitch.addEventListener('change', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeSwitch.checked = true;
    }

    getDetailsBtn.addEventListener('click', async () => {
        const videoUrl = youtubeUrlInput.value.trim();
        if (!videoUrl) {
            alert('Please enter a YouTube video URL.');
            return;
        }

        getDetailsBtn.disabled = true;
        videoInfo.classList.add('hidden');
        summarySection.classList.add('hidden');

        try {
            const response = await fetch('http://127.0.0.1:5000/video-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_url: videoUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An error occurred.');
            }

            const data = await response.json();
            videoTitle.textContent = data.title;
            languageSelect.innerHTML = '';
            data.languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = lang.name;
                languageSelect.appendChild(option);
            });
            
            // Update video preview
            updateVideoPreview(videoUrl);
            
            videoInfo.classList.remove('hidden');
        } catch (error) {
            alert(`Error fetching video details: ${error.message}`);
        } finally {
            getDetailsBtn.disabled = false;
        }
    });

    summarizeBtn.addEventListener('click', async () => {
        const videoUrl = youtubeUrlInput.value.trim();
        const languageCode = languageSelect.value;

        summaryText.textContent = '';
        loader.style.display = 'block';
        summarizeBtn.disabled = true;
        summarySection.classList.remove('hidden');
        summaryText.textContent = 'Fetching transcript...';

        try {
            const response = await fetch('http://127.0.0.1:5000/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_url: videoUrl, language_code: languageCode }),
            });

            summaryText.textContent = 'Summarizing transcript...';

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An error occurred.');
            }

            const data = await response.json();
            summaryText.textContent = data.summary;
            currentSummary = data.summary;
            // Reset to text view when new summary is generated
            summaryTextView.classList.remove('hidden');
            mindmapView.classList.add('hidden');
            toggleMindmapBtn.classList.remove('active');
            mindmapData = null;
        } catch (error) {
            summaryText.textContent = `Error: ${error.message}`;
        } finally {
            loader.style.display = 'none';
            summarizeBtn.disabled = false;
        }
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(summaryText.textContent).then(() => {
            alert('Summary copied to clipboard!');
        }, () => {
            alert('Failed to copy summary.');
        });
    });

    // Simple Mind map functionality
    function parseSummaryToMindMap(summary) {
        // Create a simple mind map structure from the summary
        const lines = summary.split('\n').filter(line => line.trim());
        
        const data = {
            name: "Video Summary",
            children: [],
            type: "root"
        };

        let currentTopic = null;
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Skip very short lines
            if (trimmedLine.length < 10) return;
            
            // Detect main headers or numbered points
            if (/^\d+\./.test(trimmedLine) || /^[-•*]\s/.test(trimmedLine) || trimmedLine.endsWith(':')) {
                const content = trimmedLine.replace(/^\d+\.\s*|^[-•*]\s*|:$/g, '').substring(0, 40);
                
                if (content.length > 5) {
                    currentTopic = {
                        name: content,
                        children: [],
                        type: "topic"
                    };
                    data.children.push(currentTopic);
                }
            }
            // Add details to current topic
            else if (currentTopic && trimmedLine.length > 15 && currentTopic.children.length < 3) {
                const content = trimmedLine.substring(0, 35);
                currentTopic.children.push({
                    name: content,
                    type: "detail"
                });
            }
            // Create standalone topics if no current topic
            else if (!currentTopic && trimmedLine.length > 15 && data.children.length < 6) {
                data.children.push({
                    name: trimmedLine.substring(0, 40),
                    type: "topic"
                });
            }
        });

        // Ensure we have some content
        if (data.children.length === 0) {
            const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 5);
            sentences.forEach(sentence => {
                data.children.push({
                    name: sentence.trim().substring(0, 40),
                    type: "topic"
                });
            });
        }

        return data;
    }
        // Extract important keywords from text
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);
        
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word))
            .slice(0, 3);

    function groupSentencesByTopic(sentences) {
        // Simple topic grouping based on keyword similarity
        const topics = [];
        const used = new Set();
        
        sentences.forEach((sentence, i) => {
            if (used.has(i)) return;
            
            const keywords = extractKeywords(sentence);
            const related = [];
            
            sentences.forEach((otherSentence, j) => {
                if (i !== j && !used.has(j)) {
                    const otherKeywords = extractKeywords(otherSentence);
                    const similarity = keywords.filter(k => otherKeywords.includes(k)).length;
                    
                    if (similarity > 0) {
                        related.push(otherSentence.trim());
                        used.add(j);
                    }
                }
            });
            
            topics.push({
                main: sentence.trim(),
                related: related.slice(0, 3) // Limit related sentences
            });
            used.add(i);
        });
        
        return topics.slice(0, 8); // Limit total topics
    }

    function createMindMap(data) {
        const container = document.getElementById('mindmap-container');
        container.innerHTML = ''; // Clear previous content

        const width = container.offsetWidth || 800;
        const height = 600;
        const selectedLayout = document.getElementById('layout-select').value;

        // Create main SVG with enhanced features
        const svg = d3.select('#mindmap-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');

        // Add definitions for gradients and filters
        const defs = svg.append('defs');
        
        // Gradient definitions
        const gradient = defs.append('linearGradient')
            .attr('id', 'nodeGradient')
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '100%').attr('y2', '100%');
        gradient.append('stop').attr('offset', '0%').style('stop-color', '#ff7e5f');
        gradient.append('stop').attr('offset', '100%').style('stop-color', '#feb47b');

        // Glow filter
        const filter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-20%').attr('y', '-20%')
            .attr('width', '140%').attr('height', '140%');
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '4')
            .attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const g = svg.append('g');

        // Enhanced zoom behavior with smooth transitions
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);
        currentZoom = zoom;
        currentSvg = svg;

        const root = d3.hierarchy(data);
        
        // Different layouts based on selection
        if (selectedLayout === 'force') {
            createForceLayout(root, g, width, height, svg, zoom);
        } else if (selectedLayout === 'radial') {
            createRadialLayout(root, g, width, height, svg, zoom);
        } else {
            createTreeLayout(root, g, width, height, svg, zoom);
        }
    }

    function createTreeLayout(root, g, width, height, svg, zoom) {
        // ULTRA aggressive tree layout with MASSIVE spacing to eliminate ALL overlap
        const tree = d3.tree()
            .size([height - 600, width - 1200]) // HUGE margins
            .separation((a, b) => {
                // ULTRA massive separation between ALL nodes
                let baseSeparation = a.parent === b.parent ? 10 : 20; // Massive base separation
                
                // Additional separation based on text length
                const aTextLength = a.data.name.length;
                const bTextLength = b.data.name.length;
                const textFactor = Math.max(aTextLength, bTextLength) / 10;
                
                // HUGE extra separation for detail nodes (leaf nodes)
                if (a.data.type === 'detail' || b.data.type === 'detail') {
                    baseSeparation *= 4; // 4x more space for details
                }
                
                // Extra separation for any leaf nodes
                if (!a.children || !b.children) {
                    baseSeparation *= 3; // 3x more space for any leaf nodes
                }
                
                return baseSeparation * (1.5 + textFactor);
            });

        tree(root);

        // Apply MASSIVE manual spacing adjustments
        root.each(d => {
            if (d.parent) {
                const siblings = d.parent.children || [];
                const myIndex = siblings.indexOf(d);
                
                // HUGE vertical offset based on index to prevent ANY overlap
                d.x += myIndex * 120; // Massive vertical spacing
                
                // HUGE horizontal offset for depth
                d.y += d.depth * 350; // Massive horizontal spacing
                
                // Extra spacing for leaf nodes
                if (!d.children) {
                    d.x += myIndex * 80; // Even more space for leaf nodes
                }
            }
        });

        // Create cleaner links with better curves
        const link = g.selectAll('.link')
            .data(root.links())
            .enter().append('path')
            .attr('class', 'link')
            .attr('d', d => {
                const sourceX = d.source.y + 400; // Massive offset
                const sourceY = d.source.x + 300; // Massive offset
                const targetX = d.target.y + 400;
                const targetY = d.target.x + 300;
                
                return `M${sourceX},${sourceY}
                        C${(sourceX + targetX) / 2},${sourceY}
                         ${(sourceX + targetX) / 2},${targetY}
                         ${targetX},${targetY}`;
            })
            .style('fill', 'none')
            .style('stroke', 'rgba(255, 255, 255, 0.6)')
            .style('stroke-width', d => {
                if (d.target.data.type === 'detail') return 2;
                if (d.target.data.type === 'key-point') return 3;
                return 4;
            })
            .style('opacity', 0.8);

        // Update node positioning with MASSIVE offsets
        const node = g.selectAll('.node')
            .data(root.descendants())
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y + 400},${d.x + 300})`) // Massive offsets
            .style('cursor', 'pointer');

        addNodeElements(node);
        addNodeInteractions(node, svg, zoom);
        
        // Auto-center with better positioning
        setTimeout(() => {
            const bounds = g.node().getBBox();
            const scale = Math.min(width / bounds.width, height / bounds.height) * 0.4; // Much smaller scale for more space
            const translateX = (width - bounds.width * scale) / 2 - bounds.x * scale;
            const translateY = (height - bounds.height * scale) / 2 - bounds.y * scale;

            svg.transition()
                .duration(1500)
                .call(zoom.transform, d3.zoomIdentity
                    .translate(translateX, translateY)
                    .scale(scale));
        }, 1000);
    }

    function createRadialLayout(root, g, width, height, svg, zoom) {
        // Radial layout with ULTRA aggressive spacing for circular mind map
        const radius = Math.min(width, height) / 2 - 300; // MASSIVE margin
        const tree = d3.tree()
            .size([2 * Math.PI, radius])
            .separation((a, b) => {
                // ULTRA massive separation for radial layout
                const baseSep = a.parent === b.parent ? 6 : 12; // Much larger base separation
                const textFactor = Math.max(a.data.name.length, b.data.name.length) / 5;
                return (baseSep * (2 + textFactor)) / a.depth;
            });

        tree(root);

        // Transform coordinates to cartesian with MASSIVE spacing
        root.each(d => {
            const angle = d.x - Math.PI / 2;
            // Add HUGE extra radius based on text length to prevent overlap
            const extraRadius = d.data.name.length * 8; // Increased text factor
            const depthRadius = d.depth * 120; // Massive depth spacing
            const finalRadius = d.y + extraRadius + depthRadius;
            
            d.x = finalRadius * Math.cos(angle) + width / 2;
            d.y = finalRadius * Math.sin(angle) + height / 2;
        });

        // Create radial links
        const link = g.selectAll('.link')
            .data(root.links())
            .enter().append('path')
            .attr('class', 'link')
            .attr('d', d => {
                return `M${d.source.x},${d.source.y}
                        Q${(d.source.x + d.target.x) / 2},${(d.source.y + d.target.y) / 2}
                         ${d.target.x},${d.target.y}`;
            })
            .style('fill', 'none')
            .style('stroke', 'rgba(255, 255, 255, 0.6)')
            .style('stroke-width', 3)
            .style('opacity', 0.8);

        // Create nodes for radial layout
        const node = g.selectAll('.node')
            .data(root.descendants())
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .style('cursor', 'pointer');

        addNodeElements(node);
        addNodeInteractions(node, svg, zoom);
    }

    function createForceLayout(root, g, width, height, svg, zoom) {
        // Force layout with ULTRA aggressive collision detection and spacing
        const nodes = root.descendants();
        const links = root.links();

        // Add unique IDs
        nodes.forEach((d, i) => d.id = i);

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
                // MASSIVE distances based on text length and depth
                const textLength = Math.max(d.source.data.name.length, d.target.data.name.length);
                const depthFactor = Math.max(d.source.depth, d.target.depth) * 100;
                return 300 + textLength * 8 + depthFactor; // HUGE base distance
            }))
            .force('charge', d3.forceManyBody().strength(d => {
                // ULTRA strong repulsion for nodes with longer text
                const textLength = d.data.name.length;
                return -1200 - (textLength * 20); // MASSIVE repulsion
            }))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => {
                // MASSIVE collision radius based on text length and type
                const textLength = d.data.name.length;
                const baseRadius = d.data.type === 'root' ? 200 : 
                                 d.data.type === 'main-topic' ? 150 : 120;
                return baseRadius + textLength * 6; // HUGE collision radius
            }))
            .force('x', d3.forceX(width / 2).strength(0.05)) // Weaker centering for more spread
            .force('y', d3.forceY(height / 2).strength(0.05));

        // Create force links
        const link = g.selectAll('.link')
            .data(links)
            .enter().append('line')
            .attr('class', 'link')
            .style('stroke', 'rgba(255, 255, 255, 0.6)')
            .style('stroke-width', 3)
            .style('opacity', 0.8);

        const node = g.selectAll('.node')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Add node elements and interactions
        addNodeElements(node);
        addNodeInteractions(node, svg, zoom);

        simulation.on('tick', () => {
            // Constrain nodes to stay within bounds with MASSIVE padding
            const padding = 200; // Increased padding
            nodes.forEach(d => {
                d.x = Math.max(padding, Math.min(width - padding, d.x));
                d.y = Math.max(padding, Math.min(height - padding, d.y));
            });

            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }

    function createNodes(root, g, svg, zoom, layout = 'tree') {
        // Create better positioned nodes
        const node = g.selectAll('.node')
            .data(root.descendants())
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => {
                if (layout === 'radial') {
                    return `translate(${d.x},${d.y})`;
                }
                return `translate(${d.y + 200},${d.x + 100})`;
            })
            .style('cursor', 'pointer');

        addNodeElements(node);
        addNodeInteractions(node, svg, zoom);
    }

    function addNodeElements(node) {
        // Add better node circles
        node.append('circle')
            .attr('class', 'node-main')
            .attr('r', d => {
                if (d.data.type === 'root') return 25;
                if (d.data.type === 'main-topic') return 18;
                if (d.data.type === 'key-point') return 14;
                return 10;
            })
            .style('fill', d => getNodeColor(d.data.type))
            .style('stroke', 'white')
            .style('stroke-width', 3)
            .style('filter', 'url(#glow)')
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .delay((d, i) => i * 100)
            .style('opacity', 1);

        // ULTRA aggressive text handling to eliminate ALL overlapping
        node.each(function(d) {
            const nodeGroup = d3.select(this);
            let text = d.data.name;
            
            // EXTREMELY strict text limits based on node type
            let maxLength;
            if (d.data.type === 'root') {
                maxLength = 20;
            } else if (d.data.type === 'main-topic') {
                maxLength = 25;
            } else if (d.data.type === 'key-point') {
                maxLength = 30;
            } else {
                maxLength = 35;
            }
            
            // Truncate text if too long
            if (text.length > maxLength) {
                text = text.substring(0, maxLength - 3) + '...';
            }
            
            // Calculate MASSIVE spacing to prevent any overlap
            const isRightSide = d.children ? false : true;
            let baseDistance = 60; // Increased from 45
            
            // HUGE additional spacing based on depth and position
            let additionalOffset = 0;
            if (d.parent) {
                const siblings = d.parent.children || [];
                const myIndex = siblings.indexOf(d);
                // Massive spacing between siblings
                additionalOffset = myIndex * 60; // Increased from 20
                
                // Extra spacing based on depth
                additionalOffset += d.depth * 40;
                
                // Even more spacing for leaf nodes (end nodes)
                if (!d.children && siblings.length > 1) {
                    additionalOffset += myIndex * 80; // Extra spacing for leaf nodes
                }
            }
            
            const dx = isRightSide ? baseDistance + additionalOffset : -(baseDistance + additionalOffset);
            
            // Create text with background
            const textGroup = nodeGroup.append('g')
                .attr('class', 'text-group');

            // Add background rectangle with better styling like Bootstrap example
            const textBg = textGroup.append('rect')
                .attr('class', 'text-background')
                .style('fill', d => {
                    // Color-coded backgrounds based on node type
                    switch(d.data.type) {
                        case 'root': return 'rgba(44, 62, 80, 0.9)';
                        case 'main-topic': return 'rgba(52, 73, 94, 0.9)';
                        case 'key-point': return 'rgba(127, 140, 141, 0.9)';
                        default: return 'rgba(0, 0, 0, 0.8)';
                    }
                })
                .style('stroke', d => {
                    // Matching border colors
                    switch(d.data.type) {
                        case 'root': return '#ecf0f1';
                        case 'main-topic': return '#bdc3c7';
                        case 'key-point': return '#95a5a6';
                        default: return 'rgba(255, 255, 255, 0.4)';
                    }
                })
                .style('stroke-width', 1.5)
                .style('rx', d => d.data.type === 'root' ? 12 : 8)
                .style('ry', d => d.data.type === 'root' ? 12 : 8);

            // Create single line text with better typography
            const fontSize = d.data.type === 'root' ? 16 : 
                           d.data.type === 'main-topic' ? 14 : 
                           d.data.type === 'key-point' ? 12 : 10;
            
            const textElement = textGroup.append('text')
                .attr('x', dx)
                .attr('y', 0)
                .style('text-anchor', isRightSide ? 'start' : 'end')
                .style('dominant-baseline', 'middle')
                .style('font-size', fontSize + 'px')
                .style('font-family', '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif')
                .style('font-weight', d.data.type === 'root' ? 'bold' : 
                                    d.data.type === 'main-topic' ? '600' : 'normal')
                .style('fill', '#ffffff')
                .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
                .style('pointer-events', 'none')
                .text(text);

            // Size the background to fit the text with extra padding
            setTimeout(() => {
                try {
                    const textBounds = textElement.node().getBBox();
                    const padding = 12; // Increased padding
                    
                    textBg
                        .attr('x', textBounds.x - padding)
                        .attr('y', textBounds.y - padding)
                        .attr('width', textBounds.width + (padding * 2))
                        .attr('height', textBounds.height + (padding * 2));
                } catch (e) {
                    // Fallback if getBBox fails
                    const estimatedWidth = text.length * fontSize * 0.6;
                    const padding = 12;
                    textBg
                        .attr('x', isRightSide ? dx - padding : dx - estimatedWidth - padding)
                        .attr('y', -fontSize/2 - padding)
                        .attr('width', estimatedWidth + (padding * 2))
                        .attr('height', fontSize + (padding * 2));
                }
            }, 100);
        });
    }

    function addNodeInteractions(node, svg, zoom) {
        // Enhanced hover effects
        node.on('mouseover', function(event, d) {
            d3.select(this).select('.node-main')
                .transition()
                .duration(200)
                .attr('r', d => {
                    if (d.data.type === 'root') return 30;
                    if (d.data.type === 'main-topic') return 22;
                    if (d.data.type === 'key-point') return 17;
                    return 13;
                });

            // Show clean tooltip
            showTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            d3.select(this).select('.node-main')
                .transition()
                .duration(200)
                .attr('r', d => {
                    if (d.data.type === 'root') return 25;
                    if (d.data.type === 'main-topic') return 18;
                    if (d.data.type === 'key-point') return 14;
                    return 10;
                });
            
            hideTooltip();
        })
        .on('click', function(event, d) {
            // Focus on clicked node with smooth animation
            const bounds = svg.select('g').node().getBBox();
            const width = svg.attr('width');
            const height = svg.attr('height');
            
            const nodeX = d.y ? d.y + 200 : d.x;
            const nodeY = d.x ? d.x + 100 : d.y;
            
            const transform = d3.zoomIdentity
                .translate(width / 2 - nodeX, height / 2 - nodeY)
                .scale(1.5);
            
            svg.transition()
                .duration(750)
                .call(zoom.transform, transform);
        });
    }

    function showTooltip(event, d) {
        const tooltip = d3.select('body').selectAll('.mindmap-tooltip').data([0]);
        const tooltipEnter = tooltip.enter().append('div')
            .attr('class', 'mindmap-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px')
            .style('border-radius', '8px')
            .style('font-size', '12px')
            .style('max-width', '250px')
            .style('z-index', '1000')
            .style('pointer-events', 'none')
            .style('border', '1px solid rgba(255, 255, 255, 0.2)');

        const tooltipUpdate = tooltipEnter.merge(tooltip);
        
        let tooltipContent = `<strong>${d.data.name}</strong><br/>`;
        tooltipContent += `<span style="color: #aaa;">Type: ${d.data.type.replace('-', ' ')}</span>`;
        if (d.data.keywords && d.data.keywords.length > 0) {
            tooltipContent += `<br/><span style="color: #ccc;">Keywords: ${d.data.keywords.join(', ')}</span>`;
        }
        
        tooltipUpdate.transition().duration(200).style('opacity', 1);
        tooltipUpdate.html(tooltipContent)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    function hideTooltip() {
        d3.select('body').selectAll('.mindmap-tooltip')
            .transition().duration(200).style('opacity', 0)
            .remove();
    }

    function getNodeColor(type) {
        // Better color scheme inspired by the Bootstrap mind map
        switch(type) {
            case 'root': 
                return '#2c3e50'; // Dark blue-gray for center
            case 'main-topic': 
                // Different colors for main categories like the Bootstrap example
                const mainTopicColors = ['#e74c3c', '#3498db', '#f39c12', '#27ae60', '#9b59b6'];
                const index = Math.abs(type.hashCode ? type.hashCode() : 0) % mainTopicColors.length;
                return mainTopicColors[index];
            case 'key-point': 
                return '#34495e'; // Medium gray-blue
            case 'detail': 
                return '#7f8c8d'; // Light gray
            default: 
                return '#95a5a6'; // Default gray
        }
    }

    toggleMindmapBtn.addEventListener('click', () => {
        if (!currentSummary) {
            alert('Please generate a summary first!');
            return;
        }

        const isTextView = !summaryTextView.classList.contains('hidden');
        
        if (isTextView) {
            // Switch to mind map view
            summaryTextView.classList.add('hidden');
            mindmapView.classList.remove('hidden');
            toggleMindmapBtn.classList.add('active');
            
            // Generate mind map if not already created
            if (!mindmapData) {
                mindmapData = parseSummaryToMindMap(currentSummary);
            }
            createMindMap(mindmapData);
        } else {
            // Switch to text view
            summaryTextView.classList.remove('hidden');
            mindmapView.classList.add('hidden');
            toggleMindmapBtn.classList.remove('active');
        }
    });

    // Reset zoom control
    resetZoomBtn.addEventListener('click', () => {
        if (currentSvg && currentZoom) {
            const container = document.getElementById('mindmap-container');
            const width = container.offsetWidth || 800;
            const height = 600;
            
            currentSvg.transition()
                .duration(750)
                .call(currentZoom.transform, d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(1));
        }
    });

    // Expand all nodes control
    expandAllBtn.addEventListener('click', () => {
        if (currentSvg) {
            const bounds = currentSvg.select('g').node().getBBox();
            const container = document.getElementById('mindmap-container');
            const width = container.offsetWidth || 800;
            const height = 600;
            const widthScale = width / bounds.width;
            const heightScale = height / bounds.height;
            const scale = Math.min(widthScale, heightScale) * 0.9;
            const translateX = (width - bounds.width * scale) / 2 - bounds.x * scale;
            const translateY = (height - bounds.height * scale) / 2 - bounds.y * scale;

            currentSvg.transition()
                .duration(1000)
                .call(currentZoom.transform, d3.zoomIdentity
                    .translate(translateX, translateY)
                    .scale(scale));
        }
    });

    // Export mind map as PNG
    exportMindmapBtn.addEventListener('click', () => {
        if (!currentSvg) {
            alert('No mind map to export!');
            return;
        }

        const svgElement = currentSvg.node();
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = svgElement.width.baseVal.value;
        canvas.height = svgElement.height.baseVal.value;
        
        const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
                const link = document.createElement('a');
                link.download = 'mindmap.png';
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(url);
                URL.revokeObjectURL(link.href);
            }, 'image/png');
        };
        
        img.src = url;
    });

    // Layout selector
    layoutSelect.addEventListener('change', () => {
        if (mindmapData && !mindmapView.classList.contains('hidden')) {
            // Show loading indicator
            const container = document.getElementById('mindmap-container');
            container.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: white; font-size: 18px;">Updating layout...</div>';
            
            // Delay to show loading message
            setTimeout(() => {
                createMindMap(mindmapData);
            }, 100);
        }
    });
});
