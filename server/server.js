// server/server.js
// This is the final, reviewed, and stable backend for the Explora application.

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
const crypto = require('crypto');
const jszip = require('jszip'); // New dependency for zipping files

const app = express();
const port = 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());
const storage = multer.memoryStorage();
// **MODIFIED**: Switched from .single() to .array() to accept multiple files.
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit per file
});

// ===================================================================================
// --- Prompts and Configurations ---
// ===================================================================================

const BRD_SYSTEM_PROMPT = `You are an expert Business Analyst AI specializing in extracting structured requirements from unstructured data and generating comprehensive Business Requirements Documentation (BRD). Your task is to analyze raw meeting transcripts, notes, and other requirement gathering artifacts to produce a professional BRD.
Core Instructions
Primary Objective: Transform unstructured requirement gathering data into a structured, comprehensive Business Requirements Document following the provided template format.
Input Processing Guidelines:
1.	Data Analysis: Carefully read and analyze all provided raw materials (transcripts, notes, emails, documents)
2.	Requirement Extraction: Identify and extract business requirements, functional requirements, non-functional requirements, constraints, assumptions, and dependencies
3.	Template Adherence: Structure the output according to the provided BRD template, ensuring all required sections and columns are populated
4.	Quality Assurance: Ensure completeness, accuracy, and professional presentation
Analytical Framework
1. Content Identification
•	Stakeholder Information: Extract names, roles, departments, and contact details
•	Business Context: Identify project background, objectives, and scope
•	Functional Requirements: Extract what the system/process should do
•	Non-Functional Requirements: Identify performance, security, usability, technicality and compliance needs
•	Business Rules: Extract policies, regulations, and operational constraints
•	Assumptions: Identify stated or implied assumptions
•	Dependencies: Extract internal and external dependencies
•	Risks and Issues: Identify potential challenges and concerns
2. Requirement Classification
•	Must-Have (Critical): Essential for project success
•	Should-Have (Important): Significant value but not critical
•	Could-Have (Nice-to-Have): Desirable but not essential
•	Won't-Have (Out of Scope): Explicitly excluded from current scope
3. Traceability and Validation
•	Link each requirement to its source in the raw data
•	Ensure requirements are specific, measurable, achievable, relevant, and time-bound (SMART)
	•	Identify potential conflicts or gaps in requirements
Output Structure Guidelines
Professional Standards:
•	Use clear, concise, and unambiguous language
•	Maintain consistent formatting and numbering
•	Include proper section headers and subsections
•	Ensure logical flow and organization
Template Compliance:
•	Follow the exact structure provided in the sample template
•	Populate all required fields and columns
•	Maintain any specific formatting requirements
	•	Include placeholder text or "TBD" for missing information that should be clarified
Content Quality:
•	Ensure each requirement is atomic (one requirement per item)
•	Use active voice and specific terminology
•	Include acceptance criteria where applicable
	•	Provide sufficient detail for development teams
Processing Instructions
1.	Initial Analysis:
o	Review all raw materials thoroughly
o	Identify key themes and patterns
	o	Note any contradictions or ambiguities
2.	Requirement Extraction:
o	Extract explicit requirements (directly stated)
o	Infer implicit requirements (implied by context)
	o	Organize by functional area or process
3.	Template Population:
o	Map extracted requirements to template sections
o	Ensure all template fields are addressed
	o	Maintain traceability to source materials
4.	Quality Review:
o	Check for completeness and consistency
o	Verify requirements are testable and measurable
	o	Ensure professional presentation
Special Considerations
•	Ambiguity Resolution: When requirements are unclear, note assumptions made and recommend clarification
•	Missing Information: Clearly identify gaps that need stakeholder input
•	Conflicting Requirements: Highlight contradictions and suggest resolution approaches
•	Scope Management: Clearly delineate in-scope vs. out-of-scope items
Input Requirements
Please provide:
1.	Raw Materials: All meeting transcripts, notes, emails, and other requirement gathering documents
2.	BRD Template: The sample file with required headings, columns, and structure to follow. This is provided as a markdown template.
3.	Project Context (if available): Project name, timeline, key stakeholders, and business objectives
Output Deliverable
Generate a complete Business Requirements Document that:
•	Follows the provided template exactly
•	Contains all extracted and organized requirements
•	Includes proper traceability and classification
•	Maintains professional quality and clarity
•	Identifies areas needing further clarification
•	Provides a solid foundation for project planning and development
Note: If any critical information is missing or unclear in the raw materials, explicitly highlight these gaps and recommend specific questions or clarifications needed from stakeholders.`;

const BRD_MARKDOWN_TEMPLATE = `
# [Project Name] - Business Requirements Document (BRD)

## 1. Document Control
| Version | Author | Date | Status | Reviewers |
|---|---|---|---|---|
| 0.1 (Draft) | AI Business Analyst | [Date] | Draft – For Review | [Stakeholder Names] |

## 2. Executive Summary
[Provide a brief overview of the project, the business problem it solves, and the proposed solution. This should be derived from the transcript.]

## 3. Business Objectives
* [Objective 1 derived from transcript]
* [Objective 2 derived from transcript]
* [Objective 3 derived from transcript]

## 4. Project Scope
**In Scope**
* [In-scope item 1 derived from transcript]
* [In-scope item 2 derived from transcript]

**Out of Scope**
* [Out-of-scope item 1 derived from transcript]
* [Out-of-scope item 2 derived from transcript]

## 5. Stakeholder Analysis
| Name | Role / Dept. | Interest | Contact |
|---|---|---|---|
| [Name] | [Role / Department] | [Interest in Project] | TBD |
| [Name] | [Role / Department] | [Interest in Project] | TBD |

## 6. Current State Overview
[Describe the current process as understood from the transcript, highlighting pain points and inefficiencies. Use bullet point format strictly.]

## 7. Future State Vision
[Describe the envisioned future state with the proposed solution, focusing on improvements and benefits. Use bullet point format strictly.]

## 8. Functional Requirements
| ID | Description | Priority | Acceptance Criteria | Source |
|---|---|---|---|---|
| FR-1 | [Functional requirement description] | [Must/Should/Could] | [Acceptance criteria for the requirement] | [Source, e.g., Transcript timestamp] |
| FR-2 | [Functional requirement description] | [Must/Should/Could] | [Acceptance criteria for the requirement] | [Source, e.g., Transcript timestamp] |

## 9. Non-Functional Requirements
| ID | Description | Metric / Target | Priority |
|---|---|---|---|
| NFR-1 | [Non-functional requirement description] | [Metric or target for the requirement] | [High/Medium/Low] |
| NFR-2 | [Non-functional requirement description] | [Metric or target for the requirement] | [High/Medium/Low] |

## 10. Business Rules
* [Business rule 1 derived from transcript]
* [Business rule 2 derived from transcript]

## 11. Assumptions
* [Assumption 1 derived from transcript]
* [Assumption 2 derived from transcript]

## 12. Dependencies
* [Dependency 1 derived from transcript]
* [Dependency 2 derived from transcript]

## 13. Constraints
* [Constraint 1 derived from transcript]
* [Constraint 2 derived from transcript]

## 14. Risks & Issues
| Risk / Issue | Probability | Impact | Mitigation |
|---|---|---|---|
| [Risk or Issue description] | [High/Medium/Low] | [High/Medium/Low] | [Mitigation strategy] |

## 15. MoSCoW Prioritisation
**Must-Have**
* [Requirement ID]
* [Requirement ID]

**Should-Have**
* [Requirement ID]

**Could-Have**
* [Requirement ID]

**Won’t-Have (this phase)**
* [Feature or requirement explicitly out of scope]

## 16. Traceability Matrix
| Requirement ID | Source (e.g., Transcript timestamp) | Validation Method |
|---|---|---|
| [Requirement ID] | [Source] | [Validation Method] |
| [Requirement ID] | [Source] | [Validation Method] |

## 17. Process Flow Descriptions
**[Process 1 Name]**
[Describe the steps of the process flow as understood from the transcript.]

**[Process 2 Name]**
[Describe the steps of the process flow as understood from the transcript.]

## 18. Approval & Sign-off
| Name | Role | Signature / Date |
|---|---|---|
| [Approver Name] | [Role] | ____________________ |
| [Approver Name] | [Role] | ____________________ |
`;

// **FIXED**: The prompt is now much stricter to prevent invalid syntax generation.
const FLOWCHART_PROMPT = `You are a specialist AI that ONLY generates Mermaid.js flowchart code.
**ABSOLUTE RULES:**
1.  Your ENTIRE response MUST be a single Mermaid code block starting with \`\`\`mermaid and ending with \`\`\`.
2.  The first line inside the code block MUST be \`graph TD;\`.
3.  Use simple IDs for nodes (e.g., A, B, C1, C2).
4.  Define node text within brackets: \`A[Text for Step 1]\`. Use curly braces for decisions: \`B{Is condition met?}\`.
5.  Connect nodes ONLY with \`-->\`.
6.  Label decision paths like this: \`B-- Yes -->C\` or \`B-- No -->D\`.
7.  DO NOT add ANY comments, explanations, or text outside the \`\`\`mermaid\`\`\` block.
8.  DO NOT use subgraphs or any advanced features. Stick to basic nodes and connections.
9. You cannot use brackets "(" or ")" anywhere in the flowchart. 
For example: B -- Approved --> C[Process Payment (Processing)]; 
This is not allowed, because we have brackets in the node text.

**EXAMPLE OF A PERFECT RESPONSE:**
\`\`\`mermaid
graph TD;
    A[Start] --> B{Check Status};
    B -- Approved --> C[Process Payment];
    B -- Rejected --> D[Send Notification];
    C --> E[End];
    D --> E;
\`\`\`

**YOUR TASK:**
Convert the following process description into Mermaid code, following all rules strictly and precisely.
`;

// Prompt to intelligently extract a section from a document
const SECTION_EXTRACTOR_PROMPT = `You are an expert text analysis AI. Your task is to extract a specific section from the provided document.
The user will specify which section they want (e.g., "Current State", "Future Vision").
Analyze the document and return ONLY the full text content of that specific section, from the section header to the beginning of the next section.
Do not include the section header itself in your output. Do not add any commentary or explanation.
For example, if the document has a section "## 6. Current State Overview" followed by paragraphs, and the next section is "## 7. Future State Vision", you must return only the paragraphs under "Current State Overview".

The section to extract is: `;

// configuration settings for AI providers
const aiConfig = {
    entityExtractionProvider: 'spacy',
    brdGenerationProvider: 'gemini',
    flowGenerationProvider: 'gemini',
    sectionExtractionProvider: 'gemini',

    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        entityExtractionModel: 'gemini-2.0-flash',
        brdGenerationModel: 'gemini-2.5-flash',
        flowGenerationModel: 'gemini-2.5-flash',
        sectionExtractionModel: 'gemini-2.0-flash',
        apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        entityExtractionModel: 'gpt-3.5-turbo',
        brdGenerationModel: 'gpt-4o',
        flowGenerationModel: 'gpt-4o',
        sectionExtractionModel: 'gpt-4o',
        apiBaseUrl: 'https://api.openai.com/v1',
    },
    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        brdGenerationModel: 'deepseek/deepseek-r1:free',
        flowGenerationModel: 'deepseek/deepseek-r1:free',
        sectionExtractionModel: 'deepseek/deepseek-r1-0528:free',
        apiBaseUrl: 'https://openrouter.ai/api/v1',
        siteUrl: 'http://localhost:3000',
        appName: 'Explora'
    },
    spacy: {
        pythonPath: 'python3',
        scriptPath: 'ner_spacy.py'
    }
};

// --- Helper Functions ---
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//Sanitizes text to remove confusing formatting before sending to the AI.
const sanitizeTextForFlowchart = (text) => {
    if (!text) return '';
    return text.split('\n')
        .filter(line => !/^[\s*\-=_]{3,}$/.test(line.trim())) // Remove horizontal rules
        .map(line => line.replace(/^(\s*(\*|\-|\d+\.)\s*)+/, '')) // Remove list markers
        .filter(line => line.trim().length > 0) // Remove empty lines
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
            docChildren.push(new Paragraph({ text: line.substring(4).trim(), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
            continue;
        }
        if (line.startsWith('## ')) {
            docChildren.push(new Paragraph({ text: line.substring(3).trim(), heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
            continue;
        }
        if (line.startsWith('# ')) {
            docChildren.push(new Paragraph({ text: line.substring(2).trim(), heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 140 } }));
            continue;
        }
        if (line.trim().startsWith('* ')) {
            docChildren.push(new Paragraph({ children: parseInlineFormatting(line.trim().substring(2)), bullet: { level: 0 } }));
            continue;
        }
        const numberedListMatch = line.match(/^(\d+)\.\s(.*)/);
        if (numberedListMatch) {
             docChildren.push(new Paragraph({ children: parseInlineFormatting(numberedListMatch[2]), numbering: { reference: "numbered-list", level: 0 } }));
             continue;
        }

        if (line.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
            const tableRows = [];
            const headerCells = line.split('|').slice(1, -1).map(cell => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cell.trim(), bold: true })] })] }));
            tableRows.push(new TableRow({ children: headerCells, tableHeader: true }));
            
            i += 2;
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                const bodyCells = lines[i].split('|').slice(1, -1).map(cell => new TableCell({ children: [new Paragraph(cell.trim())] }));
                tableRows.push(new TableRow({ children: bodyCells }));
                i++;
            }
            i--;

            const table = new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
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
        numbering: {
            config: [
                {
                    reference: "numbered-list",
                    levels: [{
                        level: 0,
                        format: "decimal",
                        text: "%1.",
                        style: {
                            paragraph: {
                                indent: { left: 720, hanging: 360 },
                            },
                        },
                    }],
                },
            ],
        },
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

// **NEW**: Function to create a self-contained HTML viewer for a flowchart.
const createFlowchartHtml = (mermaidCode) => {
    // Escape backticks in the mermaid code to prevent breaking the template literal
    const escapedCode = mermaidCode.replace(/`/g, '\\`');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Process Flow Diagram</title>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; background-color: #f9fafb; }
        #flowchart-container { background-color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; justify-content: center; }
        .error { color: #b91c1c; border: 1px dashed #f87171; background-color: #fee2e2; padding: 15px; border-radius: 8px; }
        .controls { margin-bottom: 20px; }
        button { background-color: #4f46e5; color: white; border: none; padding: 10px 15px; border-radius: 8px; font-size: 14px; cursor: pointer; }
        button:hover { background-color: #4338ca; }
    </style>
</head>
<body>
    <div class="controls">
        <button id="copy-btn">Copy Editable Code</button>
    </div>
    <div id="flowchart-container">Rendering...</div>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: false });

        const mermaidCode = \`${escapedCode}\`;
        const container = document.getElementById('flowchart-container');
        
        document.getElementById('copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(mermaidCode).then(() => {
                alert('Mermaid code copied to clipboard! You can now paste this into Lucidchart or another editor.');
            }, () => {
                alert('Failed to copy code.');
            });
        });

        async function render() {
            try {
                const { svg } = await mermaid.render('graphDiv', mermaidCode);
                container.innerHTML = svg;
            } catch (e) {
                container.innerHTML = '<div class="error">Error rendering diagram: ' + e.message + '</div>';
            }
        }
        render();
    </script>
</body>
</html>`;
};


// ===================================================================================
// --- AI Model Adapters ---
// ===================================================================================

// **ROBUST SOLUTION**: Use the AI to find and extract a section from the BRD.
const extractSectionWithAI = async (fullBrdText, sectionDescription) => {
    console.log(`Intelligently extracting '${sectionDescription}' section using AI...`);
    const provider = aiConfig.sectionExtractionProvider;
    const { apiKey, apiBaseUrl, sectionExtractionModel, siteUrl, appName } = aiConfig[provider];
    
    const fullPrompt = `${SECTION_EXTRACTOR_PROMPT}"${sectionDescription}"\n\nDOCUMENT:\n${fullBrdText}`;
    
    let response;
    if (provider === 'gemini') {
        const apiUrl = `${apiBaseUrl}/${sectionExtractionModel}:generateContent?key=${apiKey}`;
        response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }] }) });
    } else { // OpenAI and OpenRouter compatible
        const apiUrl = `${apiBaseUrl}/chat/completions`;
        const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = siteUrl;
            headers['X-Title'] = appName;
        }
        response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify({ model: sectionExtractionModel, messages: [{ role: "user", content: fullPrompt }] }) });
    }

    if (!response.ok) throw new Error(`${provider} Section Extraction failed: ${response.statusText}`);
    const result = await response.json();
    const extractedText = provider === 'gemini' ? result.candidates?.[0]?.content?.parts?.[0]?.text : result.choices?.[0]?.message?.content;
    
    if (!extractedText || extractedText.trim().length < 20) { // Add a sanity check
        console.error("AI section extraction returned little or no content. Full BRD was:\n", fullBrdText);
        throw new Error(`AI failed to reliably extract the '${sectionDescription}' section.`);
    }
    return extractedText;
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
                return reject(new Error(`Entity extraction with spaCy failed. ${errorData}`));
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

const generateBRDWithGeminiAdapter = async (anonymizedContent) => {
    const { apiKey, apiBaseUrl, brdGenerationModel } = aiConfig.gemini;
    const apiUrl = `${apiBaseUrl}/${brdGenerationModel}:generateContent?key=${apiKey}`;
    
    const fullPrompt = `${BRD_SYSTEM_PROMPT}
---
HERE IS THE BRD TEMPLATE TO USE FOR YOUR OUTPUT. GENERATE HIGH-QUALITY OUTPUT AFTER CONSIDERING THE BELOW TEMPLATE:
${BRD_MARKDOWN_TEMPLATE}
---
ANALYZE THE FOLLOWING TRANSCRIPT AND GENERATE A HIGH-QUALITY BRD WHILE STRICTLY FOLLOWING ALL THE ABOVE INSTRUCTIONS:
${anonymizedContent}`;

    const payload = { contents: [{ role: "user", parts: [{ text: fullPrompt }] }] };
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Gemini BRD generation failed with status ${response.status}`);
    const result = await response.json();
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("Gemini BRD generation returned an empty response.");
    return result.candidates[0].content.parts[0].text;
};

const generateBRDWithOpenAIAdapter = async (anonymizedContent) => {
    const { apiKey, apiBaseUrl, brdGenerationModel } = aiConfig.openai;
    const apiUrl = `${apiBaseUrl}/chat/completions`;

    const fullUserPrompt = `HERE IS THE BRD TEMPLATE TO USE FOR YOUR OUTPUT. POPULATE IT BASED ON THE TRANSCRIPT:
${BRD_MARKDOWN_TEMPLATE}
---
ANALYZE THE FOLLOWING TRANSCRIPT AND GENERATE THE BRD:
${anonymizedContent}`;

    const payload = {
        model: brdGenerationModel,
        messages: [
            { role: "system", content: BRD_SYSTEM_PROMPT },
            { role: "user", content: fullUserPrompt }
        ]
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`OpenAI BRD generation failed with status ${response.status}`);
    const result = await response.json();
    if (!result.choices?.[0]?.message?.content) throw new Error("OpenAI BRD generation returned an empty response.");
    return result.choices[0].message.content;
};

// **NEW**: Adapter for generating BRD with OpenRouter
const generateBRDWithOpenRouterAdapter = async (anonymizedContent) => {
    const { apiKey, apiBaseUrl, brdGenerationModel, siteUrl, appName } = aiConfig.openrouter;
    const apiUrl = `${apiBaseUrl}/chat/completions`;

    const fullUserPrompt = `HERE IS THE BRD TEMPLATE TO USE FOR YOUR OUTPUT. POPULATE IT BASED ON THE TRANSCRIPT:
${BRD_MARKDOWN_TEMPLATE}
---
ANALYZE THE FOLLOWING TRANSCRIPT AND GENERATE THE BRD:
${anonymizedContent}`;

    const payload = {
        model: brdGenerationModel,
        messages: [
            { role: "system", content: BRD_SYSTEM_PROMPT },
            { role: "user", content: fullUserPrompt }
        ]
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': siteUrl,
            'X-Title': appName
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`OpenRouter BRD generation failed with status ${response.status}`);
    const result = await response.json();
    if (!result.choices?.[0]?.message?.content) throw new Error("OpenRouter BRD generation returned an empty response.");
    return result.choices[0].message.content;
};

// **NEW**: Adapter for generating Flowcharts with OpenRouter
const generateProcessFlowWithOpenRouterAdapter = async (processDescription) => {
    const { apiKey, apiBaseUrl, flowGenerationModel, siteUrl, appName } = aiConfig.openrouter;
    const apiUrl = `${apiBaseUrl}/chat/completions`;
    
    const fullPrompt = `${FLOWCHART_PROMPT}\n\n${processDescription}`;
    
    const payload = {
        model: flowGenerationModel,
        messages: [{ role: "user", content: fullPrompt }]
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': siteUrl,
            'X-Title': appName
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`OpenRouter Flow generation failed: ${response.statusText}`);
    const result = await response.json();
    return result.choices?.[0]?.message?.content || '';
};

// **DEFINITIVE FIX**: This function now programmatically cleans the AI's output.
// **REFACTORED & FIXED**: This function now cleanly handles multiple providers.
const generateFlowchart = async (processDescription) => {
    const provider = aiConfig.flowGenerationProvider;
    console.log(`[LOG] Using provider: ${provider} for flow generation.`);
    
    let rawResponse = '';
    const fullPrompt = `${FLOWCHART_PROMPT}\n\n${processDescription}`;

    // Call the appropriate provider function
    switch(provider) {
        case 'openai':
            const { apiKey: openAIApiKey, apiBaseUrl: openAIApiBaseUrl, flowGenerationModel: openAIFlowModel } = aiConfig.openai;
            const openAIPayload = { model: openAIFlowModel || 'gpt-4o', messages: [{ role: "user", content: fullPrompt }] };
            const openAIResponse = await fetch(`${openAIApiBaseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIApiKey}` }, body: JSON.stringify(openAIPayload) });
            if (!openAIResponse.ok) throw new Error(`OpenAI Flow generation failed: ${openAIResponse.statusText}`);
            const openAIResult = await openAIResponse.json();
            rawResponse = openAIResult.choices?.[0]?.message?.content || '';
            break;
        case 'openrouter': // **NEW**
             rawResponse = await generateProcessFlowWithOpenRouterAdapter(processDescription);
             break;
        case 'gemini':
        default:
            const { apiKey: geminiApiKey, apiBaseUrl: geminiApiBaseUrl, flowGenerationModel: geminiFlowModel } = aiConfig.gemini;
            const geminiPayload = { contents: [{ role: "user", parts: [{ text: fullPrompt }] }] };
            const geminiResponse = await fetch(`${geminiApiBaseUrl}/${geminiFlowModel || 'gemini-1.5-flash'}:generateContent?key=${geminiApiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload) });
            if (!geminiResponse.ok) throw new Error(`Gemini Flow generation failed: ${geminiResponse.statusText}`);
            const geminiResult = await geminiResponse.json();
            rawResponse = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
            break;
    }
    
    // First, extract the code block.
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/;
    let mermaidCode = '';
    const match = rawResponse.match(mermaidRegex);

    if (match && match[1]) {
        mermaidCode = match[1].trim();
    } else {
        const cleanedResponse = rawResponse.replace(/^(.*?)```mermaid/, '').replace(/```(.*)$/, '').trim();
        if (cleanedResponse.startsWith('graph')) {
            mermaidCode = cleanedResponse;
        }
    }

    if (!mermaidCode) {
        console.error("[ERROR] Failed to extract any Mermaid code from LLM response:", rawResponse);
        throw new Error("The AI failed to generate a process flow diagram in the expected format.");
    }

    // **DEFINITIVE CLEANING STEP**:
    // Split the extracted code into lines and filter out any invalid separator lines.
    const lines = mermaidCode.split('\n');
    const cleanedLines = lines.filter(line => {
        const trimmedLine = line.trim();
        // A line is invalid if it ONLY contains dashes, underscores, or equals signs,
        // and does not contain valid Mermaid connection syntax like '-->' or node brackets '[', '{'.
        return !(/^[\s\-=_]+$/.test(trimmedLine) && !trimmedLine.includes('-->'));
    });
    
    const finalCleanedCode = cleanedLines.join('\n');

    if (!finalCleanedCode.startsWith('graph')) {
         console.error("[ERROR] Final cleaned code is not a valid Mermaid graph:", finalCleanedCode);
         throw new Error("The AI-generated flowchart was invalid after cleaning.");
    }

    return finalCleanedCode;
};

// ===================================================================================
// --- Core Application Logic ---
// ===================================================================================

const extractEntities = async (text) => {
    const provider = aiConfig.entityExtractionProvider;
    console.log(`Using provider: ${provider} for entity extraction.`);
    
    switch(provider) {
        case 'spacy':
            return await extractEntitiesWithSpacyAdapter(text);
        default:
            console.log("Defaulting to spaCy for entity extraction.");
            return await extractEntitiesWithSpacyAdapter(text);
    }
};

const generateBRD = async (anonymizedContent) => {
    const provider = aiConfig.brdGenerationProvider;
    console.log(`Using provider: ${provider} for BRD generation.`);

    switch(provider) {
        case 'openai':
            return await generateBRDWithOpenAIAdapter(anonymizedContent);
        case 'openrouter':
            return await generateBRDWithOpenRouterAdapter(anonymizedContent);
        case 'gemini':
        default:
            return await generateBRDWithGeminiAdapter(anonymizedContent);
    }
};

const anonymizeText = async (text) => {
    const entities = await extractEntities(text);
    const mapping = new Map();
    let anonymizedText = text;
    const allEntities = [
        ...(entities.people || []).map(p => ({ name: p, type: 'PER' })),
        ...(entities.organizations || []).map(o => ({ name: o, type: 'ORG' })),
        ...(entities.locations || []).map(l => ({ name: l, type: 'LOC' }))
    ];
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
};

// ===================================================================================
// --- API Endpoints (Refactored to use Caching) ---
// ===================================================================================

app.post('/api/generate', upload.array('files', 10), async (req, res) => {
    const reqId = uuidv4().slice(0, 8);
    console.log(`[${reqId}] Received request for /api/generate with ${req.files.length} file(s).`);
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded.' });

    let requestedArtifacts;
    try {
        requestedArtifacts = JSON.parse(req.body.artifacts);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid artifacts format.' });
    }

    try {
        let combinedOriginalContent = '';
        const originalFilesContent = [];
        for (const file of req.files) {
            const fileContent = await getFileContent(file);
            originalFilesContent.push({ name: file.originalname, content: fileContent });
            combinedOriginalContent += `--- START OF DOCUMENT: ${file.originalname} ---\n\n${fileContent}\n\n--- END OF DOCUMENT: ${file.originalname} ---\n\n`;
        }

        console.log(`[${reqId}] Creating master entity map from all documents...`);
        const { anonymizedText: anonymizedCombinedContent, mapping: masterMapping } = await anonymizeText(combinedOriginalContent);

        const generatedResults = {};
        let brdText = '';

        const needsBrd = requestedArtifacts.some(art => ['brd', 'asisFlow', 'tobeFlow'].includes(art));
        if (needsBrd) {
            console.log(`[${reqId}] Generating unified BRD from anonymized content...`);
            brdText = await generateBRD(anonymizedCombinedContent);

            if (requestedArtifacts.includes('brd')) {
                console.log(`[${reqId}] De-anonymizing BRD for final document...`);
                let finalBRDText = brdText;
                for (let [code, original] of masterMapping.entries()) {
                    const regex = new RegExp(`\\b${escapeRegExp(code)}\\b`, 'g');
                    finalBRDText = finalBRDText.replace(regex, original);
                }
                const docxBuffer = await createDocxBufferFromMarkdown(finalBRDText);
                generatedResults.brd = { fileName: 'BRD_Explora_Unified.docx', content: docxBuffer.toString('base64'), contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
            }
        }

        if (requestedArtifacts.includes('asisFlow') && brdText) {
            console.log(`[${reqId}] Generating As-Is Flow...`);
            const asIsText = await extractSectionWithAI(brdText, "Current State Overview");
            const sanitizedAsIsText = sanitizeTextForFlowchart(asIsText);
            const mermaidCode = await generateFlowchart(sanitizedAsIsText);
            // Generate both the editable .txt and the viewable .html
            generatedResults.asisFlow = { fileName: 'As_Is_Flow_Editable.txt', content: Buffer.from(mermaidCode).toString('base64'), contentType: 'text/plain' };
            generatedResults.asisFlowView = { fileName: 'As_Is_Flow_View.html', content: Buffer.from(createFlowchartHtml(mermaidCode)).toString('base64'), contentType: 'text/html' };
        }
        if (requestedArtifacts.includes('tobeFlow') && brdText) {
            console.log(`[${reqId}] Generating To-Be Flow...`);
            const toBeText = await extractSectionWithAI(brdText, "Future State Vision");
            const sanitizedToBeText = sanitizeTextForFlowchart(toBeText);
            const mermaidCode = await generateFlowchart(sanitizedToBeText);
            // Generate both the editable .txt and the viewable .html
            generatedResults.tobeFlow = { fileName: 'To_Be_Flow_Editable.txt', content: Buffer.from(mermaidCode).toString('base64'), contentType: 'text/plain' };
            generatedResults.tobeFlowView = { fileName: 'To_Be_Flow_View.html', content: Buffer.from(createFlowchartHtml(mermaidCode)).toString('base64'), contentType: 'text/html' };
        }

        if (requestedArtifacts.includes('anonymized')) {
            console.log(`[${reqId}] Generating individual anonymized files for zip...`);
            const anonymizedFileResults = [];
            for (const file of originalFilesContent) {
                const { anonymizedText } = await anonymizeText(file.content, masterMapping);
                anonymizedFileResults.push({
                    fileName: `Anonymized_${file.name}.txt`,
                    content: anonymizedText
                });
            }
            const zip = new jszip();
            for (const result of anonymizedFileResults) {
                zip.file(result.fileName, result.content);
            }
            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
            generatedResults.anonymized = { fileName: 'Anonymized_Texts.zip', content: zipBuffer.toString('base64'), contentType: 'application/zip' };
        }

        if (requestedArtifacts.includes('mapping')) {
            console.log(`[${reqId}] Creating consolidated redaction key...`);
            let csvContent = "Code,Original_Entity\n";
            for (let [code, original] of masterMapping.entries()) {
                csvContent += `${code},"${original.replace(/"/g, '""')}"\n`;
            }
            generatedResults.mapping = { fileName: 'Redaction_Key.csv', content: Buffer.from(csvContent).toString('base64'), contentType: 'text/csv' };
        }

        console.log(`[${reqId}] Successfully generated all requested artifacts.`);
        res.status(200).json(generatedResults);

    } catch (error) {
        console.error(`[${reqId}] Error in /api/generate:`, error);
        res.status(500).json({ error: error.message });
    }
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`Explora server listening on http://localhost:${port}`);
});