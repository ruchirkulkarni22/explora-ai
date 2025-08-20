// server/server.js
// IMPROVED VERSION - Fixed prompts and better model compatibility
// Features: Clean prompts, better error handling, model flexibility

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const mammoth = require('mammoth');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = docx;
const { spawn } = require('child_process');
const jszip = require('jszip');
const xlsx = require('xlsx');

const app = express();
const port = 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit per file
});

// ===================================================================================
// --- IMPROVED PROMPTS - CLEAR AND CONCISE ---
// ===================================================================================

const BRD_SYSTEM_PROMPT = `You are a professional Business Analyst. Create a comprehensive Business Requirements Document (BRD) from the provided materials.

TASK: Transform the input documents into a well-structured BRD following the template provided.

REQUIREMENTS:
1. Extract all business requirements, functional requirements, and constraints
2. Identify stakeholders, objectives, and scope
3. Create clear acceptance criteria for each requirement
4. Use the exact template structure provided
5. Be specific and actionable - no vague statements

QUALITY STANDARDS:
- Requirements must be testable and measurable
- Use clear, professional language
- Include traceability to source material
- Mark unclear items as "TBD" with notes for clarification

OUTPUT: Generate the complete BRD using the template structure.`;

const BRD_MARKDOWN_TEMPLATE = `# [Project Name] - Business Requirements Document

## 1. Document Control
| Version | Author | Date | Status |
|---------|--------|------|--------|
| 1.0 | Business Analyst | [Current Date] | Draft |

## 2. Executive Summary
[2-3 sentence summary of the project and its business value]

## 3. Business Objectives
- [Primary business objective]
- [Secondary business objective] 
- [Additional objectives as needed]

## 4. Project Scope

### In Scope
- [What is included in this project]
- [Key features and functions]

### Out of Scope  
- [What is explicitly excluded]
- [Future phase items]

## 5. Stakeholders
| Name | Role | Department | Involvement Level |
|------|------|------------|-------------------|
| [Name] | [Role] | [Dept] | [High/Medium/Low] |

## 6. Current State Process
[Describe current process in clear, sequential steps - this will be used to generate As-Is flow]

## 7. Future State Process  
[Describe desired future process in clear, sequential steps - this will be used to generate To-Be flow]

## 8. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|---------|
| FR-1 | [Clear requirement statement] | Must/Should/Could | [Specific, testable criteria] | [Source reference] |

## 9. Non-Functional Requirements
| ID | Requirement | Target Metric | Priority |
|----|-------------|---------------|----------|
| NFR-1 | [Performance/Security/Usability requirement] | [Specific metric] | High/Medium/Low |

## 10. Business Rules
- [Rule 1: Clear business policy or constraint]
- [Rule 2: Another business rule]

## 11. Assumptions & Dependencies
### Assumptions
- [Key assumption about project or environment]

### Dependencies  
- [External dependency that could impact project]

## 12. Risks & Mitigation
| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|-------------------|
| [Risk description] | High/Med/Low | High/Med/Low | [How to address] |

## 13. Acceptance Criteria Summary
- All functional requirements must be met
- Performance targets achieved
- User acceptance testing completed
- Documentation delivered

## 14. Approval
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Business Owner | [TBD] | _________ | ____ |
| IT Lead | [TBD] | _________ | ____ |`;

// COMPLETELY REWRITTEN FLOW GENERATION PROMPT - SIMPLE AND EFFECTIVE
const PROCESS_FLOW_PROMPT = `You are a process diagram expert. Convert the business process description into a Draw.io XML flowchart.

RULES:
1. Output ONLY valid Draw.io XML starting with <mxfile> and ending with </mxfile>
2. Use standard flowchart shapes: rectangles for tasks, diamonds for decisions, ellipses for start/end
3. Create clean, readable layout with proper spacing
4. Connect all elements with arrows showing process flow
5. If process description is too vague, create an error diagram explaining what's needed

SHAPE GUIDELINES:
- Start/End: Use ellipse shape
- Process Step: Use rounded rectangle  
- Decision: Use diamond/rhombus shape
- All text should be centered and readable

LAYOUT REQUIREMENTS:
- Logical top-to-bottom or left-to-right flow
- No overlapping elements
- Clear connections between steps
- Proper spacing between elements

Generate the Draw.io XML now:`;

const SECTION_EXTRACTOR_PROMPT = `Extract the requested section from the document below. 

INSTRUCTIONS:
1. Find the section that matches: "[SECTION_NAME]"
2. Return ONLY the content under that section (not the heading)
3. Include all content until the next major section begins
4. Do not add commentary or explanations

Section to extract: `;

const SUMMARY_PROMPT = `Create a concise executive summary from the provided document(s).

REQUIREMENTS:
- One paragraph maximum
- Include: main problem, proposed solution, key objectives
- Use clear, business-appropriate language
- Focus on the most important points

Document to summarize:`;

// IMPROVED TEST CASE PROMPT - MUCH CLEARER
const TEST_CASE_PROMPT = `You are a Senior QA Engineer. Generate comprehensive test cases from the provided BRD.

OUTPUT FORMAT: Valid JSON array where each object represents ONE test step.

REQUIRED FIELDS for each test step:
{
  "Test Case ID": "TC_001", 
  "Module": "User Management",
  "Feature": "User Registration",
  "Test Case Summary": "Verify user can register with valid data",
  "Test Type": "Functional",
  "Priority": "High",
  "Prerequisites": "Application is accessible",
  "Epic Link": "USER-001", 
  "Sprint": "Sprint 1",
  "Step Number": 1,
  "Step Description": "Navigate to registration page",
  "Test Data": "Email: test@example.com, Password: Test123!",
  "Expected Result": "Registration page displays correctly"
}

QUALITY REQUIREMENTS:
1. Create positive, negative, and edge case scenarios
2. Be specific with test data and expected results
3. Each step should be actionable by a manual tester
4. Group related steps under the same Test Case ID
5. No duplicate or redundant test cases

OUTPUT: JSON array only, no other text.`;

// ===================================================================================
// --- IMPROVED CONFIGURATION ---
// ===================================================================================

const aiConfig = {
    entityExtractionProvider: 'spacy',
    brdGenerationProvider: 'openrouter',
    flowGenerationProvider: 'openrouter',
    sectionExtractionProvider: 'openrouter',
    testCaseGenerationProvider: 'openrouter',

    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        brdGenerationModel: 'gemini-2.5-flash',
        flowGenerationModel: 'gemini-2.5-flash',
        sectionExtractionModel: 'gemini-2.5-flash',
        testCaseGenerationModel: 'gemini-2.5-flash',
        apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        brdGenerationModel: 'gpt-4o',
        flowGenerationModel: 'gpt-4o',
        sectionExtractionModel: 'gpt-4o',
        testCaseGenerationModel: 'gpt-4o',
        apiBaseUrl: 'https://api.openai.com/v1',
    },
    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        brdGenerationModel: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        flowGenerationModel: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        sectionExtractionModel: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        testCaseGenerationModel: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        apiBaseUrl: 'https://openrouter.ai/api/v1',
        siteUrl: 'http://localhost:5173',
        appName: 'Explora'
    },
    spacy: {
        pythonPath: 'python3',
        scriptPath: 'ner_spacy.py'
    },
    pptAnalyzer: {
        pythonPath: 'python3', // or the path to your python executable inside the venv
        scriptPath: 'ppt_analyzer.py'
    }
};

// ===================================================================================
// --- IMPROVED HELPER FUNCTIONS ---
// ===================================================================================

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeTextForFlowchart = (text) => {
    if (!text) return '';
    return text.split('\n')
        .filter(line => !/^[\s*\-=_]{3,}$/.test(line.trim()))
        .map(line => line.replace(/^(\s*(\*|\-|\d+\.)\s*)+/, ''))
        .filter(line => line.trim().length > 0)
        .join('\n');
};

const getFileContent = async (file) => {
    if (!file) throw new Error("File not provided to getFileContent function.");
    const { buffer, mimetype } = file;
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return (await mammoth.extractRawText({ buffer })).value;
    } else if (['text/plain', 'text/markdown', 'text/csv'].includes(mimetype)) {
        return buffer.toString('utf-8');
    } else {
        throw new Error(`Unsupported file type: ${mimetype}.`);
    }
};

const createDocxBufferFromMarkdown = async (markdownText) => {
    if (typeof markdownText !== 'string') {
        throw new Error("Cannot create document because the generated content was invalid.");
    }
    const docChildren = [];
    const lines = markdownText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (line.startsWith('### ')) {
            docChildren.push(new Paragraph({ 
                text: line.substring(4).trim(), 
                heading: HeadingLevel.HEADING_3, 
                spacing: { before: 200, after: 100 } 
            }));
            continue;
        }
        if (line.startsWith('## ')) {
            docChildren.push(new Paragraph({ 
                text: line.substring(3).trim(), 
                heading: HeadingLevel.HEADING_2, 
                spacing: { before: 240, after: 120 } 
            }));
            continue;
        }
        if (line.startsWith('# ')) {
            docChildren.push(new Paragraph({ 
                text: line.substring(2).trim(), 
                heading: HeadingLevel.HEADING_1, 
                spacing: { before: 280, after: 140 } 
            }));
            continue;
        }
        if (line.trim().startsWith('* ')) {
            docChildren.push(new Paragraph({ 
                children: parseInlineFormatting(line.trim().substring(2)), 
                bullet: { level: 0 } 
            }));
            continue;
        }
        
        // Handle tables
        if (line.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
            const tableRows = [];
            const headerCells = line.split('|').slice(1, -1).map(cell => 
                new TableCell({ 
                    children: [new Paragraph({ 
                        children: [new TextRun({ text: cell.trim(), bold: true })] 
                    })] 
                })
            );
            tableRows.push(new TableRow({ children: headerCells, tableHeader: true }));
            
            i += 2; // Skip separator line
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                const bodyCells = lines[i].split('|').slice(1, -1).map(cell => 
                    new TableCell({ children: [new Paragraph(cell.trim())] })
                );
                tableRows.push(new TableRow({ children: bodyCells }));
                i++;
            }
            i--; // Adjust for loop increment

            const table = new Table({ 
                rows: tableRows, 
                width: { size: 100, type: WidthType.PERCENTAGE } 
            });
            docChildren.push(table);
            continue;
        }
        
        if (line.trim().length > 0) {
            docChildren.push(new Paragraph({ children: parseInlineFormatting(line) }));
        } else {
            docChildren.push(new Paragraph(""));
        }
    }
    
    const doc = new Document({ 
        sections: [{ properties: {}, children: docChildren }] 
    });
    return Packer.toBuffer(doc);
};

const parseInlineFormatting = (line) => {
    const runs = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
            runs.push(new TextRun(line.substring(lastIndex, match.index)));
        }
        const matchedText = match[0];
        if (matchedText.startsWith('**')) {
            runs.push(new TextRun({ text: matchedText.slice(2, -2), bold: true }));
        } else if (matchedText.startsWith('*')) {
            runs.push(new TextRun({ text: matchedText.slice(1, -1), italics: true }));
        }
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < line.length) {
        runs.push(new TextRun(line.substring(lastIndex)));
    }
    return runs;
};

// ===================================================================================
// --- IMPROVED AI ADAPTERS WITH BETTER ERROR HANDLING ---
// ===================================================================================

const callAI = async (provider, systemPrompt, userPrompt, taskType = 'generation') => {
    console.log(`Calling ${provider} for ${taskType}...`);
    
    let modelName;
    const config = aiConfig[provider];
    
    // Select appropriate model based on task
    switch (taskType) {
        case 'brd': modelName = config.brdModel; break;
        case 'flow': modelName = config.flowModel; break;
        case 'section': modelName = config.sectionModel; break;
        case 'test': modelName = config.testModel; break;
        default: modelName = config.brdModel;
    }
    
    let response;
    
    if (provider === 'gemini') {
        const apiUrl = `${config.apiBaseUrl}/${modelName}:generateContent?key=${config.apiKey}`;
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
        const payload = { 
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192
            }
        };
        response = await fetch(apiUrl, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
    } else {
        // OpenAI and OpenRouter compatible
        const apiUrl = `${config.apiBaseUrl}/chat/completions`;
        const headers = { 
            'Authorization': `Bearer ${config.apiKey}`, 
            'Content-Type': 'application/json' 
        };
        
        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = config.siteUrl;
            headers['X-Title'] = config.appName;
        }
        
        const messages = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: userPrompt });
        
        const payload = { 
            model: modelName, 
            messages,
            temperature: 0.1,
            max_tokens: 8192
        };
        
        response = await fetch(apiUrl, { 
            method: 'POST', 
            headers, 
            body: JSON.stringify(payload) 
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${provider} API failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    let content;
    
    if (provider === 'gemini') {
        content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
        content = result.choices?.[0]?.message?.content;
    }

    if (!content) {
        throw new Error(`${provider} returned empty response`);
    }

    return content.trim();
};

// ===================================================================================
// --- CORE FUNCTIONS WITH BETTER ERROR HANDLING ---
// ===================================================================================

const extractSectionWithAI = async (fullBrdText, sectionDescription) => {
    console.log(`Extracting '${sectionDescription}' section...`);
    const provider = aiConfig.sectionExtractionProvider;
    const fullPrompt = `${SECTION_EXTRACTOR_PROMPT}${sectionDescription}\n\nDOCUMENT:\n${fullBrdText}`;
    
    try {
        const extractedText = await callAI(provider, null, fullPrompt, 'section');
        
        if (extractedText.trim().length < 10) {
            throw new Error(`AI extracted very little content for '${sectionDescription}'`);
        }
        return extractedText;
    } catch (error) {
        console.error(`Failed to extract section '${sectionDescription}':`, error);
        return `[Could not extract ${sectionDescription} section - please review manually]`;
    }
};

const generateSummaryFromText = async (text) => {
    console.log(`Generating executive summary...`);
    const provider = aiConfig.sectionExtractionProvider;
    const fullPrompt = `${SUMMARY_PROMPT}\n\n${text}`;
    
    try {
        const summary = await callAI(provider, null, fullPrompt, 'section');
        return summary || "Executive summary could not be generated from the provided content.";
    } catch (error) {
        console.error("Failed to generate summary:", error);
        return "Executive summary could not be generated due to processing error.";
    }
};

const extractEntitiesWithSpacyAdapter = async (text) => {
    const { pythonPath, scriptPath } = aiConfig.spacy;

    return new Promise((resolve, reject) => {
        const pythonProcess = spawn(pythonPath, [scriptPath]);
        let jsonData = '';
        let errorData = '';
        
        pythonProcess.stdout.on('data', (data) => { jsonData += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`spaCy script exited with code ${code}: ${errorData}`);
                return reject(new Error(`Entity extraction failed: ${errorData}`));
            }
            try {
                resolve(JSON.parse(jsonData));
            } catch (e) {
                reject(new Error('Failed to parse JSON response from spaCy script.'));
            }
        });
        
        pythonProcess.stdin.write(text);
        pythonProcess.stdin.end();
    });
};

const generateDrawioXmlFromProcessDescription = async (processDescription, contextSummary) => {
    const provider = aiConfig.flowGenerationProvider;
    console.log(`Generating Draw.io XML with ${provider}...`);
    
    const fullPrompt = `${PROCESS_FLOW_PROMPT}

CONTEXT: ${contextSummary}

PROCESS TO DIAGRAM: ${processDescription}`;

    try {
        const rawResponse = await callAI(provider, null, fullPrompt, 'flow');
        
        // Extract XML from response
        const xmlMatch = rawResponse.match(/<mxfile[\s\S]*?<\/mxfile>/);
        if (!xmlMatch) {
            console.error("No valid Draw.io XML found in response:", rawResponse);
            return { 
                error: "insufficient_content", 
                message: "The process description needs more specific steps to create a meaningful flowchart." 
            };
        }
        
        const cleanedResponse = xmlMatch[0];
        
        // Check for error indicators
        if (cleanedResponse.includes('Error:') || cleanedResponse.includes('insufficient')) {
            return { 
                error: "insufficient_content", 
                message: "The process description is too vague. Please provide more specific steps." 
            };
        }
        
        return cleanedResponse;
        
    } catch (error) {
        console.error("Flow generation failed:", error);
        return { 
            error: "generation_failed", 
            message: "Failed to generate process flow diagram. Please try again." 
        };
    }
};

const extractEntities = async (text) => {
    const provider = aiConfig.entityExtractionProvider;
    console.log(`Using ${provider} for entity extraction...`);
    
    try {
        return await extractEntitiesWithSpacyAdapter(text);
    } catch (error) {
        console.error("Entity extraction failed:", error);
        // Return empty entities if extraction fails
        return { people: [], organizations: [], locations: [] };
    }
};

const generateBRD = async (anonymizedContent) => {
    const provider = aiConfig.brdGenerationProvider;
    console.log(`Generating BRD with ${provider}...`);
    
    const userPrompt = `${BRD_MARKDOWN_TEMPLATE}

Using the above template, analyze the following content and generate a complete BRD:

${anonymizedContent}`;

    try {
        return await callAI(provider, BRD_SYSTEM_PROMPT, userPrompt, 'brd');
    } catch (error) {
        console.error("BRD generation failed:", error);
        throw new Error("Failed to generate BRD. Please check your content and try again.");
    }
};

const anonymizeText = async (text) => {
    console.log(`Anonymizing document content...`);
    try {
        const entities = await extractEntities(text);
        const mapping = new Map();
        let anonymizedText = text;
        
        const allEntities = [
            ...(entities.people || []).map(p => ({ name: p, type: 'PER' })),
            ...(entities.organizations || []).map(o => ({ name: o, type: 'ORG' })),
            ...(entities.locations || []).map(l => ({ name: l, type: 'LOC' }))
        ];
        
        // Sort by length to avoid partial replacements
        allEntities.sort((a, b) => b.name.length - a.name.length);
        
        allEntities.forEach(entity => {
            const code = `${entity.type}_${uuidv4().substring(0, 8).toUpperCase()}`;
            const escapedEntity = escapeRegExp(entity.name);
            const regex = new RegExp(`\\b${escapedEntity}\\b`, 'g');
            
            if (anonymizedText.match(regex)) {
                anonymizedText = anonymizedText.replace(regex, code);
                mapping.set(code, entity.name);
            }
        });
        
        return { anonymizedText, mapping };
    } catch (error) {
        console.error("Anonymization failed:", error);
        // Return original text if anonymization fails
        return { anonymizedText: text, mapping: new Map() };
    }
};

// ===================================================================================
// --- API Endpoints ---
// ===================================================================================

app.post('/api/generate-brd', upload.array('files', 10), async (req, res) => {
    const reqId = uuidv4().slice(0, 8);
    console.log(`[${reqId}] Received request for /api/generate-brd with ${req.files.length} file(s).`);
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded.' });

    let requestedArtifacts;
    try {
        requestedArtifacts = JSON.parse(req.body.artifacts);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid artifacts format.' });
    }

    try {
        console.log(`[${reqId}] --- BRD & PROCESS FLOW GENERATION PROCESS STARTED ---`);
        const firstFile = req.files[0];
        const originalName = firstFile.originalname;
        const baseName = originalName.includes('.')
            ? originalName.substring(0, originalName.lastIndexOf('.'))
            : originalName;
        let combinedOriginalContent = '';
        const originalFilesContent = [];
        for (const file of req.files) {
            const fileContent = await getFileContent(file);
            originalFilesContent.push({ name: file.originalname, content: fileContent });
            combinedOriginalContent += `--- START OF DOCUMENT: ${file.originalname} ---\n\n${fileContent}\n\n--- END OF DOCUMENT: ${file.originalname} ---\n\n`;
        }

        console.log(`[${reqId}] Creating master entity map from all documents...`);
        const { anonymizedText: anonymizedCombinedContent, mapping: masterMapping } = await anonymizeText(combinedOriginalContent);
        
        // UPDATED: No longer saving to local storage. The anonymization package will be created in memory if requested.

        const generatedResults = {};
        let brdText = '';
        let executiveSummary = '';

        const brdRequested = requestedArtifacts.includes('brd');
        const flowsRequested = requestedArtifacts.some(art => ['asisFlow', 'tobeFlow'].includes(art));
        const anonymizationRequested = requestedArtifacts.includes('anonymizationData');

        // NEW: Generate anonymization package if requested
        if (anonymizationRequested) {
            console.log(`[${reqId}] Generating anonymization package in-memory...`);
            let csvContent = "Code,Original_Entity\n";
            for (let [code, original] of masterMapping.entries()) {
                csvContent += `${code},"${original.replace(/"/g, '""')}"\n`;
            }

            const zip = new jszip();
            zip.file('anonymized_content.txt', anonymizedCombinedContent);
            zip.file('redaction_key.csv', csvContent);

            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
            
            generatedResults.anonymizationData = {
                type: 'zip',
                fileName: `${baseName}_Anonymization_Package.zip`,
                content: zipBuffer.toString('base64'),
                contentType: 'application/zip'
            };
            console.log(`[${reqId}] Anonymization package created.`);
        }


        if (brdRequested) {
            console.log(`[${reqId}] Generating unified BRD from anonymized content...`);
            const anonymizedBrdText = await generateBRD(anonymizedCombinedContent);

            // De-anonymize the BRD text immediately for use in all downstream tasks
            brdText = anonymizedBrdText;
            console.log(`[${reqId}] De-anonymizing master BRD text...`);
            for (let [code, original] of masterMapping.entries()) {
                const regex = new RegExp(`\\b${escapeRegExp(code)}\\b`, 'g');
                brdText = brdText.replace(regex, original);
            }
            
            executiveSummary = await extractSectionWithAI(brdText, "Executive Summary");

            console.log(`[${reqId}] Creating BRD .docx file...`);
            const docxBuffer = await createDocxBufferFromMarkdown(brdText);
            generatedResults.brd = { type: 'docx', fileName: `${baseName}_BRD.docx`, content: docxBuffer.toString('base64'), contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        
        } else if (flowsRequested) {
            // If only flows are requested, we still need a summary for context.
            console.log(`[${reqId}] BRD not requested. Generating summary from source for flow context...`);
            const anonymizedSummary = await generateSummaryFromText(anonymizedCombinedContent);
            
            // De-anonymize the summary
            executiveSummary = anonymizedSummary;
            for (let [code, original] of masterMapping.entries()) {
                const regex = new RegExp(`\\b${escapeRegExp(code)}\\b`, 'g');
                executiveSummary = executiveSummary.replace(regex, original);
            }
        }

        // **OPTIMIZATION**: Run As-Is and To-Be flow generation in parallel
        const flowPromises = [];

        if (requestedArtifacts.includes('asisFlow')) {
            const asIsPromise = (async () => {
                if (brdRequested) { // BRD was generated, so we can extract the section
                    console.log(`[${reqId}] Starting As-Is Flow generation from BRD...`);
                    const asIsText = await extractSectionWithAI(brdText, "Current State Overview");
                    const sanitizedAsIsText = sanitizeTextForFlowchart(asIsText);
                    const drawioResult = await generateDrawioXmlFromProcessDescription(sanitizedAsIsText, executiveSummary);
                    
                    if (drawioResult.error === 'insufficient_content') {
                        return { key: 'asisFlow', value: { type: 'drawio', needsRefinement: true, flowType: 'asisFlow', originalText: sanitizedAsIsText, context: executiveSummary, message: drawioResult.message } };
                    } else {
                        return { key: 'asisFlow', value: { type: 'drawio', fileName: `${baseName}_As_Is_Flow.drawio`, content: drawioResult, contentType: 'application/xml' } };
                    }
                } else { // BRD was NOT generated, so we must ask the user for input.
                    console.log(`[${reqId}] Triggering refinement for As-Is flow as BRD was not generated.`);
                    return { key: 'asisFlow', value: { type: 'drawio', needsRefinement: true, flowType: 'asisFlow', originalText: 'Please describe the current (As-Is) process step-by-step.', context: executiveSummary } };
                }
            })();
            flowPromises.push(asIsPromise);
        }

        if (requestedArtifacts.includes('tobeFlow')) {
            const toBePromise = (async () => {
                if (brdRequested) { // BRD was generated
                    console.log(`[${reqId}] Starting To-Be Flow generation from BRD...`);
                    const toBeText = await extractSectionWithAI(brdText, "Future State Vision");
                    const sanitizedToBeText = sanitizeTextForFlowchart(toBeText);
                    const drawioResult = await generateDrawioXmlFromProcessDescription(sanitizedToBeText, executiveSummary);

                    if (drawioResult.error === 'insufficient_content') {
                        return { key: 'tobeFlow', value: { type: 'drawio', needsRefinement: true, flowType: 'tobeFlow', originalText: sanitizedToBeText, context: executiveSummary, message: drawioResult.message } };
                    } else {
                        return { key: 'tobeFlow', value: { type: 'drawio', fileName: `${baseName}_To_Be_Flow.drawio`, content: drawioResult, contentType: 'application/xml' } };
                    }
                } else { // BRD was NOT generated
                    console.log(`[${reqId}] Triggering refinement for To-Be flow as BRD was not generated.`);
                    return { key: 'tobeFlow', value: { type: 'drawio', needsRefinement: true, flowType: 'tobeFlow', originalText: 'Please describe the future (To-Be) process step-by-step.', context: executiveSummary } };
                }
            })();
            flowPromises.push(toBePromise);
        }

        // Wait for all flow generations to complete
        const flowResults = await Promise.all(flowPromises);
        flowResults.forEach(result => {
            generatedResults[result.key] = result.value;
        });
        console.log(`[${reqId}] All parallel flow generations have completed.`);

        console.log(`[${reqId}] Successfully generated all requested artifacts.`);
        console.log(`[${reqId}] --- BRD & PROCESS FLOW GENERATION SUCCEEDED ---`);
        res.status(200).json({ reqId, artifacts: generatedResults });

    } catch (error) {
        console.error(`[${reqId}] Error in /api/generate:`, error);
        res.status(500).json({ error: error.message });
    }
});

// **NEW ENDPOINT** for refining process flows
app.post('/api/refine-flow', async (req, res) => {
    const { reqId, originalText, context, userRefinements, flowType, baseName } = req.body;
    console.log(`[${reqId}] Received request to refine ${flowType}.`);

    if (!reqId || !originalText || !context || !userRefinements || !flowType || !baseName) {
        return res.status(400).json({ error: "Missing required fields for refinement." });
    }

    try {
        // This endpoint does not need the master mapping as it only deals with flow text.
        // The de-anonymization happens on the client side if needed, or the text is already de-anonymized.
        const refinedProcessDescription = `${originalText}\n\n--- ADDITIONAL DETAILS FROM USER ---\n\n${userRefinements}`;
        const drawioResult = await generateDrawioXmlFromProcessDescription(refinedProcessDescription, context);

        if (drawioResult.error === 'insufficient_content') {
            return res.status(400).json({ error: "The refined description is still not detailed enough. Please add more specific steps." });
        }

        const finalArtifact = {
            type: 'drawio',
            fileName: `${baseName}_${flowType === 'asisFlow' ? 'As_Is' : 'To_Be'}_Flow.drawio`,
            content: drawioResult,
            contentType: 'application/xml'
        };

        console.log(`[${reqId}] Successfully refined ${flowType}.`);
        res.status(200).json({ [flowType]: finalArtifact });

    } catch (error) {
        console.error(`[${reqId}] Error in /api/refine-flow:`, error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/generate-test-cases', upload.array('files', 10), async (req, res) => {
    const reqId = uuidv4().slice(0, 8);
    console.log(`[${reqId}] Received request for /api/generate-test-cases with ${req.files.length} file(s).`);
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        console.log(`[${reqId}] --- TEST CASE GENERATION PROCESS STARTED ---`);
        let combinedOriginalContent = '';
        for (const file of req.files) {
            const fileContent = await getFileContent(file);
            combinedOriginalContent += `--- START OF DOCUMENT: ${file.originalname} ---\n\n${fileContent}\n\n--- END OF DOCUMENT ---\n\n`;
        }

        console.log(`[${reqId}] Anonymizing document content...`);
        const { anonymizedText, mapping } = await anonymizeText(combinedOriginalContent);
        
        // No longer saving reference archive locally

        console.log(`[${reqId}] Calling AI with V3 prompt to generate test cases...`);
        const userPromptForAI = `Here is the BRD content. Please generate test cases based on it:\n\n${anonymizedText}`;
        const { apiKey, apiBaseUrl, testCaseGenerationModel } = aiConfig.gemini;
        const apiUrl = `${apiBaseUrl}/${testCaseGenerationModel}:generateContent?key=${apiKey}`;
        const fullPrompt = `${TEST_CASE_SYSTEM_PROMPT}\n\n${userPromptForAI}`;
        const payload = { contents: [{ role: "user", parts: [{ text: fullPrompt }] }] };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Gemini Test Case generation failed with status ${response.status}`);
        const result = await response.json();
        const rawJsonResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonResponse) throw new Error("AI returned an empty or invalid response for test cases.");

        console.log(`[${reqId}] De-anonymizing generated test cases...`);
        let deAnonymizedResponse = rawJsonResponse;
        for (let [code, original] of mapping.entries()) {
            const regex = new RegExp(`\\b${escapeRegExp(code)}\\b`, 'g');
            deAnonymizedResponse = deAnonymizedResponse.replace(regex, original);
        }

        let testCasesJson;
        try {
            const jsonMatch = deAnonymizedResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error("No valid JSON array found in the AI response.");
            const jsonString = jsonMatch[0];
            testCasesJson = JSON.parse(jsonString);
        } catch (e) {
            console.error(`[${reqId}] Failed to parse JSON from AI. Raw response:`, deAnonymizedResponse);
            throw new Error(`The AI returned an invalid JSON format for the test cases. Parser error: ${e.message}`);
        }

        testCasesJson.sort((a, b) => {
            if (a["Test Case ID"] < b["Test Case ID"]) return -1;
            if (a["Test Case ID"] > b["Test Case ID"]) return 1;
            return a["Step Number"] - b["Step Number"];
        });

        const finalTestCases = testCasesJson.map(tc => ({
            ...tc,
            "Actual Result": "",
            "Status": "",
            "Tester": "",
            "Execution Date": "",
            "Defect ID": "",
        }));

        const workbook = xlsx.utils.book_new();

        const worksheet1 = xlsx.utils.json_to_sheet(finalTestCases);

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } },
            alignment: { vertical: "center", horizontal: "center" }
        };

        const headers = Object.keys(finalTestCases[0] || {});
        headers.forEach((_, index) => {
            const cellAddress = xlsx.utils.encode_cell({ c: index, r: 0 });
            if (worksheet1[cellAddress]) {
                worksheet1[cellAddress].s = headerStyle;
            }
        });

        const cellStyle = { alignment: { wrapText: true, vertical: "top" } };
        const dataRange = xlsx.utils.decode_range(worksheet1['!ref']);
        worksheet1['!rows'] = worksheet1['!rows'] || [];
        for (let R = 0; R <= dataRange.e.r; ++R) {
            worksheet1['!rows'][R] = { hpt: R === 0 ? 20 : 40 };
            for (let C = 0; C <= dataRange.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell = xlsx.utils.encode_cell(cell_address);
                if (!worksheet1[cell] || R === 0) continue;
                worksheet1[cell].s = cellStyle;
            }
        }

        worksheet1['!cols'] = [
            { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 50 }, { wch: 15 }, { wch: 15 },
            { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 50 }, { wch: 40 },
            { wch: 50 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }
        ];

        xlsx.utils.book_append_sheet(workbook, worksheet1, "Test Script");

        const uniqueTestCases = Array.from(new Set(finalTestCases.map(tc => tc["Test Case ID"])));
        const dashboardLogicData = [["Test Case ID", "Overall Status"]];
        uniqueTestCases.forEach((id, index) => {
            const rowNum = index + 2;
            const formula = `IF(COUNTIFS('Test Script'!A:A,A${rowNum},'Test Script'!O:O,"Fail")>0,"Fail",IF(COUNTIFS('Test Script'!A:A,A${rowNum},'Test Script'!O:O,"Blocked")>0,"Blocked",IF(COUNTIFS('Test Script'!A:A,A${rowNum},'Test Script'!O:O,"Pass")=COUNTIF('Test Script'!A:A,A${rowNum}),"Pass","Not Run")))`;
            dashboardLogicData.push([id, { t: 's', f: formula }]);
        });
        const worksheet2 = xlsx.utils.aoa_to_sheet(dashboardLogicData);
        xlsx.utils.book_append_sheet(workbook, worksheet2, "Dashboard Logic");
        worksheet2['!hidden'] = true;

        const dashboardSummaryData = [
            ["Metric", "Count"],
            ["Total Unique Test Cases", uniqueTestCases.length],
            ["Passed", { t: 'n', f: `COUNTIF('Dashboard Logic'!B:B, "Pass")` }],
            ["Failed", { t: 'n', f: `COUNTIF('Dashboard Logic'!B:B, "Fail")` }],
            ["Blocked", { t: 'n', f: `COUNTIF('Dashboard Logic'!B:B, "Blocked")` }],
            ["Not Run", { t: 'n', f: `COUNTIF('Dashboard Logic'!B:B, "Not Run")` }]
        ];
        const worksheet3 = xlsx.utils.aoa_to_sheet(dashboardSummaryData);
        worksheet3['!cols'] = [{ wch: 25 }, { wch: 15 }];
        worksheet3['A1'].s = headerStyle;
        worksheet3['B1'].s = headerStyle;
        xlsx.utils.book_append_sheet(workbook, worksheet3, "Dashboard");

        const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        const fileName = `Test_Cases_Dashboard_${req.files[0].originalname.split('.')[0]}.xlsx`;
        const previewData = [];
        const uniqueIds = Array.from(uniqueTestCases).slice(0, 3);
        uniqueIds.forEach(id => {
            const allStepsForId = finalTestCases.filter(tc => tc["Test Case ID"] === id);
            if (allStepsForId.length > 0) {
                previewData.push({
                    id: id,
                    summary: allStepsForId[0]["Test Case Summary"],
                    priority: allStepsForId[0]["Priority"],
                    steps: allStepsForId.map(step => ({
                        number: step["Step Number"],
                        description: step["Step Description"]
                    }))
                });
            }
        });

        res.status(200).json({
            fileName: fileName,
            content: excelBuffer.toString('base64'),
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            preview: previewData
        });
        console.log(`[${reqId}] Successfully generated and sent test case file with dashboard.`);
        console.log(`[${reqId}] --- TEST CASE GENERATION SUCCEEDED ---`);

    } catch (error) {
        console.error(`[${reqId}] Error in /api/generate-test-cases:`, error);
        res.status(500).json({ error: error.message || "An unknown server error occurred." });
    }
});

// --- UPDATED ENDPOINT FOR FEATURE 3: NOW RETURNS A DOWNLOAD URL ---
app.post('/api/generate-training-deck', upload.single('file'), async (req, res) => {
    const reqId = uuidv4().slice(0, 8);
    console.log(`[${reqId}] Received request for /api/generate-training-deck.`);

    if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded.' });
    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return res.status(400).json({ error: 'Invalid file type. Please upload a .xlsx file.' });
    }

    try {
        console.log(`[${reqId}] --- TRAINING DECK ANALYSIS STARTED ---`);
        const { pythonPath, scriptPath } = aiConfig.pptAnalyzer;
        const knowledgeRepoPath = path.join(__dirname, 'Knowledge_Repository');

        if (!fs.existsSync(knowledgeRepoPath)) throw new Error("Knowledge_Repository folder not found.");
        const pptFiles = fs.readdirSync(knowledgeRepoPath).filter(f => f.endsWith('.pptx'));
        if (pptFiles.length === 0) throw new Error("No PowerPoint files found in Knowledge_Repository.");

        const pythonProcess = spawn(pythonPath, [scriptPath, knowledgeRepoPath]);
        let scriptOutput = '', scriptError = '';
        pythonProcess.stdout.on('data', (data) => { scriptOutput += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { scriptError += data.toString(); });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`[${reqId}] Python script error: ${scriptError}`);
                return res.status(500).json({ error: `Analysis failed: ${scriptError}` });
            }

            try {
                console.log(`[${reqId}] Python script finished. Creating zip archive.`);
                const results = JSON.parse(scriptOutput);
                const matchedPptFiles = [...new Set(results.map(item => item['Matched PPT']))].filter(f => f !== "No relevant deck found");

                if (matchedPptFiles.length === 0) {
                    console.log(`[${reqId}] No confident matches found. Generating report only.`);
                }

                const zip = new jszip();
                for (const pptFile of matchedPptFiles) {
                    const filePath = path.join(knowledgeRepoPath, pptFile);
                    if (fs.existsSync(filePath)) {
                        zip.file(pptFile, fs.readFileSync(filePath));
                    }
                }
                
                const workbook = xlsx.utils.book_new();
                const worksheet = xlsx.utils.json_to_sheet(results);
                worksheet['!cols'] = [ { wch: 15 }, { wch: 50 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 50 } ];
                xlsx.utils.book_append_sheet(workbook, worksheet, "PPT Matching Report");
                zip.file("Matching_Report.xlsx", xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' }));

                const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
                
                const originalName = req.file.originalname.replace('.xlsx', '');
                const uniqueId = uuidv4().slice(0,8);
                const fileName = `Matched_Decks_${originalName}_${uniqueId}.zip`;
                
                // Send the buffer directly to the client instead of saving locally
                res.status(200).json({
                    fileName: fileName,
                    content: zipBuffer.toString('base64'),
                    contentType: 'application/zip'
                });
                console.log(`[${reqId}] --- TRAINING DECK ANALYSIS SUCCEEDED ---`);

            } catch (e) {
                console.error(`[${reqId}] Error creating zip file:`, e);
                res.status(500).json({ error: "Failed to create the deliverable." });
            }
        });

        pythonProcess.stdin.write(req.file.buffer);
        pythonProcess.stdin.end();

    } catch (error) {
        console.error(`[${reqId}] Error in /api/generate-training-deck:`, error);
        res.status(500).json({ error: error.message });
    }
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`Explora server listening on http://localhost:${port}`);
});