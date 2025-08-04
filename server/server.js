// server/server.js
// This version is updated to generate BPMN 2.0 XML for process flows,
// enabling in-browser editing with bpmn-js on the frontend.
// QUALITY UPGRADE: Implemented a structured JSON-first approach and a more advanced
// layout algorithm for cleaner, more professional diagrams.

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

// **QUALITY UPGRADE**: Prompt enhanced for more professional language and stricter rules.
const PROCESS_TO_JSON_PROMPT = `You are a system that translates natural language process descriptions into a structured JSON format suitable for BPMN diagram generation.

**TASK:** Analyze the provided process description and executive summary. Your entire output must be a single JSON object.

**JSON STRUCTURE:**
The JSON object must have two top-level keys: "lanes" and "nodes".

1.  **"lanes"**: An array of strings representing the actors or systems in the process (e.g., "Customer", "Sales System", "Manager"). Identify these from the text. If no specific roles are mentioned, use a default lane like "System".

2.  **"nodes"**: An array of objects, where each object represents a step, decision, or event in the process. Each node must have the following properties:
    * **"id"**: A unique integer identifier for the node (e.g., 1, 2, 3), starting from 1.
    * **"name"**: A concise, professional, verb-first label for the node (e.g., "Submit Application", "Is application complete?", "Process Approved"). Use professional business terminology.
    * **"type"**: The type of BPMN element. Must be one of: "start", "end", "task", "decision".
    * **"lane"**: The name of the lane (from the "lanes" array) that this node belongs to.
    * **"outputs"**: An array of objects describing the connections from this node to others. Each connection object must have:
        * **"target"**: The integer "id" of the node it connects to.
        * **"label"**: (Optional) A concise label for the connection, ONLY for outputs from a "decision" node (e.g., "Yes", "No", "Approved", "Rejected").

**RULES & GUIDELINES:**
* **Professional Language**: Node names must be professional and concise. Start tasks with a verb.
* **Logical Flow**: The first node must be of type "start". All process paths must eventually lead to one or more "end" nodes.
* **Decision Integrity**: "decision" nodes must have at least two outputs, and each output must have a "label".
* **Task/Event Integrity**: "task", "start", and "end" nodes should have exactly one output, with no "label", unless they are the final node.
* **Valid Connections**: Ensure all node "id"s referenced in "outputs" exist. The process must be a valid, connected graph.
* **JSON Only**: The entire response must be ONLY the JSON object, starting with \`{\` and ending with \`}\`. Do not wrap it in markdown or add explanations.

**EXAMPLE:**
Process Description: "The customer submits an order. The system checks if the item is in stock. If it is, the system processes the payment. If not, it notifies the customer that the item is backordered. The process ends after payment or notification."

**PERFECT JSON OUTPUT:**
{
  "lanes": ["Customer", "System"],
  "nodes": [
    {
      "id": 1,
      "name": "Order Submitted",
      "type": "start",
      "lane": "Customer",
      "outputs": [{ "target": 2 }]
    },
    {
      "id": 2,
      "name": "Submit Order",
      "type": "task",
      "lane": "Customer",
      "outputs": [{ "target": 3 }]
    },
    {
      "id": 3,
      "name": "Check Stock Availability",
      "type": "decision",
      "lane": "System",
      "outputs": [
        { "target": 4, "label": "In Stock" },
        { "target": 5, "label": "Out of Stock" }
      ]
    },
    {
      "id": 4,
      "name": "Process Payment",
      "type": "task",
      "lane": "System",
      "outputs": [{ "target": 6 }]
    },
    {
      "id": 5,
      "name": "Notify Customer of Backorder",
      "type": "task",
      "lane": "System",
      "outputs": [{ "target": 6 }]
    },
    {
      "id": 6,
      "name": "Process Complete",
      "type": "end",
      "lane": "System",
      "outputs": []
    }
  ]
}
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
    brdGenerationProvider: 'openrouter',
    flowGenerationProvider: 'openrouter', // This now generates JSON
    sectionExtractionProvider: 'openrouter',

    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        brdGenerationModel: 'gemini-2.5-flash',
        flowGenerationModel: 'gemini-2.5-flash',
        sectionExtractionModel: 'gemini-1.5-flash',
        apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        brdGenerationModel: 'gpt-4o',
        flowGenerationModel: 'gpt-4o',
        sectionExtractionModel: 'gpt-4o',
        apiBaseUrl: 'https://api.openai.com/v1',
    },
    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        brdGenerationModel: 'z-ai/glm-4.5-air:free',
        flowGenerationModel: 'z-ai/glm-4.5-air:free',
        sectionExtractionModel: 'z-ai/glm-4.5-air:free',
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


// ===================================================================================
// --- AI Model Adapters ---
// ===================================================================================

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
    
    if (!extractedText || extractedText.trim().length < 10) {
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

// **NEW**: Generic adapter for OpenAI/OpenRouter to reduce code duplication
const generateWithChatCompletionAdapter = async (provider, systemPrompt, userPrompt) => {
    const { apiKey, apiBaseUrl, siteUrl, appName } = aiConfig[provider];
    let model;
    // Determine which model to use based on the prompt content
    if (systemPrompt === BRD_SYSTEM_PROMPT) {
        model = aiConfig[provider].brdGenerationModel;
    } else { // Assuming flow generation
        model = aiConfig[provider].flowGenerationModel;
    }

    const apiUrl = `${apiBaseUrl}/chat/completions`;
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = siteUrl;
        headers['X-Title'] = appName;
    }
    
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userPrompt });

    const payload = { model, messages };
    const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(payload) });

    if (!response.ok) throw new Error(`${provider} generation failed with status ${response.statusText}`);
    const result = await response.json();
    if (!result.choices?.[0]?.message?.content) throw new Error(`${provider} generation returned an empty response.`);
    return result.choices[0].message.content;
};

// ===================================================================================
// --- Core Application Logic & BPMN Generation ---
// ===================================================================================

// **QUALITY UPGRADE**: Builds valid BPMN XML from a structured JSON object using an advanced layout algorithm.
const buildBpmnXmlFromJson = (processJson) => {
    const { lanes, nodes } = processJson;
    const nodeMap = new Map(nodes.map(n => [n.id, { ...n, children: [], parents: [] }]));

    // Build graph relationships
    nodes.forEach(node => {
        node.outputs.forEach(output => {
            if (nodeMap.has(output.target) && nodeMap.has(node.id)) {
                nodeMap.get(node.id).children.push(nodeMap.get(output.target));
                nodeMap.get(output.target).parents.push(nodeMap.get(node.id));
            }
        });
    });

    // 1. Calculate Columns (horizontal layers)
    const nodeColumns = {};
    let queue = nodes.filter(n => n.type === 'start').map(n => ({ id: n.id, col: 0 }));
    let visited = new Set(queue.map(q => q.id));

    while (queue.length > 0) {
        const { id, col } = queue.shift();
        nodeColumns[id] = Math.max(nodeColumns[id] || 0, col);
        const node = nodeMap.get(id);
        node.children.forEach(child => {
            if (!visited.has(child.id)) {
                queue.push({ id: child.id, col: col + 1 });
                visited.add(child.id);
            }
        });
    }

    // Group nodes by column
    const columns = [];
    for (const nodeId in nodeColumns) {
        const col = nodeColumns[nodeId];
        if (!columns[col]) columns[col] = [];
        columns[col].push(nodeMap.get(parseInt(nodeId)));
    }

    // 2. Calculate Positions
    const positions = {};
    const X_STEP = 180, Y_STEP = 120, X_START = 250, Y_START = 150;
    const EVENT_SIZE = 36, GATEWAY_SIZE = 50, TASK_WIDTH = 100, TASK_HEIGHT = 80;

    columns.forEach((colNodes, colIndex) => {
        colNodes.forEach((node, rowIndex) => {
            let width, height;
            switch (node.type) {
                case 'start': case 'end':
                    width = height = EVENT_SIZE; break;
                case 'decision':
                    width = height = GATEWAY_SIZE; break;
                default:
                    width = TASK_WIDTH; height = TASK_HEIGHT;
            }
            positions[node.id] = {
                x: X_START + colIndex * X_STEP,
                y: Y_START + rowIndex * Y_STEP,
                width,
                height
            };
        });
    });

    // 3. Generate XML
    const processId = `Process_${uuidv4()}`;
    const collaborationId = `Collaboration_${uuidv4()}`;
    const diagramId = `BPMNDiagram_${uuidv4()}`;
    const planeId = `BPMNPlane_${uuidv4()}`;
    
    let elementsXml = '';
    let flowsXml = '';
    let shapesXml = '';
    let edgesXml = '';

    nodes.forEach(node => {
        const xmlId = `Node_${node.id}`;
        node.xmlId = xmlId;
        const pos = positions[node.id];

        let outgoingFlows = '';
        node.outputs.forEach(output => {
            const flowId = `Flow_${node.id}_${output.target}`;
            const targetXmlId = `Node_${output.target}`;
            const label = output.label ? `name="${output.label}"` : '';
            flowsXml += `<bpmn:sequenceFlow id="${flowId}" sourceRef="${xmlId}" targetRef="${targetXmlId}" ${label} />\n`;
            outgoingFlows += `<bpmn:outgoing>${flowId}</bpmn:outgoing>\n`;
        });
        
        const incomingFlows = nodeMap.get(node.id).parents.map(p => `<bpmn:incoming>Flow_${p.id}_${node.id}</bpmn:incoming>`).join('\n');
        
        switch (node.type) {
            case 'start':
                elementsXml += `<bpmn:startEvent id="${xmlId}" name="${node.name}">${incomingFlows}${outgoingFlows}</bpmn:startEvent>\n`;
                break;
            case 'end':
                elementsXml += `<bpmn:endEvent id="${xmlId}" name="${node.name}">${incomingFlows}${outgoingFlows}</bpmn:endEvent>\n`;
                break;
            case 'task':
                elementsXml += `<bpmn:task id="${xmlId}" name="${node.name}">${incomingFlows}${outgoingFlows}</bpmn:task>\n`;
                break;
            case 'decision':
                elementsXml += `<bpmn:exclusiveGateway id="${xmlId}" name="${node.name}">${incomingFlows}${outgoingFlows}</bpmn:exclusiveGateway>\n`;
                break;
        }

        shapesXml += `<bpmndi:BPMNShape id="${xmlId}_di" bpmnElement="${xmlId}">\n` +
                     `<dc:Bounds x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${pos.height}" />\n` +
                     `<bpmndi:BPMNLabel><dc:Bounds x="${pos.x}" y="${pos.y + pos.height + 5}" width="${pos.width}" height="28" /></bpmndi:BPMNLabel>\n` +
                     `</bpmndi:BPMNShape>\n`;
    });

    nodes.forEach(node => {
        node.outputs.forEach(output => {
            const sourcePos = positions[node.id];
            const targetPos = positions[output.target];
            const flowId = `Flow_${node.id}_${output.target}`;
            
            edgesXml += `<bpmndi:BPMNEdge id="${flowId}_di" bpmnElement="${flowId}">\n` +
                        `<di:waypoint x="${sourcePos.x + sourcePos.width}" y="${sourcePos.y + sourcePos.height / 2}" />\n` +
                        `<di:waypoint x="${targetPos.x}" y="${targetPos.y + targetPos.height / 2}" />\n` +
                        `</bpmndi:BPMNEdge>\n`;
        });
    });

    // Create participant and lanes
    let participantXml = '';
    if (lanes && lanes.length > 0) {
        const participantId = `Participant_${uuidv4()}`;
        let lanesXml = `<bpmn:laneSet id="LaneSet_${uuidv4()}">`;
        lanes.forEach(laneName => {
            lanesXml += `<bpmn:lane id="Lane_${laneName.replace(/\s/g, '_')}" name="${laneName}">`;
            nodes.filter(n => n.lane === laneName).forEach(n => {
                lanesXml += `<bpmn:flowNodeRef>${n.xmlId}</bpmn:flowNodeRef>`;
            });
            lanesXml += `</bpmn:lane>`;
        });
        lanesXml += `</bpmn:laneSet>`;

        participantXml = `<bpmn:collaboration id="${collaborationId}">\n` +
                         `<bpmn:participant id="${participantId}" name="Process" processRef="${processId}" />\n` +
                         `</bpmn:collaboration>\n` +
                         `<bpmn:process id="${processId}" isExecutable="false">\n`+
                         `${lanesXml}${elementsXml}${flowsXml}</bpmn:process>\n`;
    } else {
        participantXml = `<bpmn:process id="${processId}" isExecutable="false">${elementsXml}${flowsXml}</bpmn:process>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_${uuidv4()}" targetNamespace="http://bpmn.io/schema/bpmn">
  ${participantXml}
  <bpmndi:BPMNDiagram id="${diagramId}">
    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${lanes.length > 0 ? collaborationId : processId}">
      ${shapesXml}
      ${edgesXml}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
};

const generateBpmnFromProcessDescription = async (processDescription, contextSummary) => {
    const provider = aiConfig.flowGenerationProvider;
    console.log(`[LOG] Using provider: ${provider} for BPMN JSON generation.`);
    
    const fullPrompt = `${PROCESS_TO_JSON_PROMPT}\n\nExecutive Summary: ${contextSummary}\n\nProcess Description: ${processDescription}`;

    let rawResponse;
    if (provider === 'gemini') {
        const { apiKey, apiBaseUrl, flowGenerationModel } = aiConfig.gemini;
        const payload = { contents: [{ role: "user", parts: [{ text: fullPrompt }] }] };
        const response = await fetch(`${apiBaseUrl}/${flowGenerationModel}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Gemini Flow generation failed: ${response.statusText}`);
        const result = await response.json();
        rawResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else { // Handles 'openai' and 'openrouter'
        rawResponse = await generateWithChatCompletionAdapter(provider, null, fullPrompt);
    }
    
    try {
        // Clean the response to ensure it's valid JSON
        const cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const processJson = JSON.parse(cleanedResponse);
        
        // Validate basic structure
        if (!processJson.lanes || !processJson.nodes) {
            throw new Error("Generated JSON is missing 'lanes' or 'nodes' keys.");
        }
        
        return buildBpmnXmlFromJson(processJson);
    } catch (error) {
        console.error("[ERROR] Failed to parse JSON from LLM or build BPMN:", error);
        console.error("Raw response was:", rawResponse);
        throw new Error("The AI failed to generate a valid process structure.");
    }
};

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
    
    const userPrompt = `HERE IS THE BRD TEMPLATE TO USE FOR YOUR OUTPUT. POPULATE IT BASED ON THE TRANSCRIPT:
${BRD_MARKDOWN_TEMPLATE}
---
ANALYZE THE FOLLOWING TRANSCRIPT AND GENERATE THE BRD:
${anonymizedContent}`;

    switch(provider) {
        case 'openai':
        case 'openrouter':
            return await generateWithChatCompletionAdapter(provider, BRD_SYSTEM_PROMPT, userPrompt);
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
// --- API Endpoints ---
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
        // Add this code right after the `try {` line
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

        const generatedResults = {};
        let brdText = '';
        let executiveSummary = '';

        const needsBrd = requestedArtifacts.some(art => ['brd', 'asisFlow', 'tobeFlow'].includes(art));
        if (needsBrd) {
            console.log(`[${reqId}] Generating unified BRD from anonymized content...`);
            brdText = await generateBRD(anonymizedCombinedContent);
            
            // Extract summary for context
            executiveSummary = await extractSectionWithAI(brdText, "Executive Summary");

            if (requestedArtifacts.includes('brd')) {
                console.log(`[${reqId}] De-anonymizing BRD for final document...`);
                let finalBRDText = brdText;
                for (let [code, original] of masterMapping.entries()) {
                    const regex = new RegExp(`\\b${escapeRegExp(code)}\\b`, 'g');
                    finalBRDText = finalBRDText.replace(regex, original);
                }
                const docxBuffer = await createDocxBufferFromMarkdown(finalBRDText);
                generatedResults.brd = { type: 'docx', fileName: `${baseName}_BRD.docx`, content: docxBuffer.toString('base64'), contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
            }
        }

        if (requestedArtifacts.includes('asisFlow') && brdText) {
            console.log(`[${reqId}] Generating As-Is Flow...`);
            const asIsText = await extractSectionWithAI(brdText, "Current State Overview");
            const sanitizedAsIsText = sanitizeTextForFlowchart(asIsText);
            const bpmnXml = await generateBpmnFromProcessDescription(sanitizedAsIsText, executiveSummary);
            generatedResults.asisFlow = { type: 'bpmn', fileName: `${baseName}_As_Is_Flow.bpmn`, content: bpmnXml, contentType: 'application/xml' };
        }
        if (requestedArtifacts.includes('tobeFlow') && brdText) {
            console.log(`[${reqId}] Generating To-Be Flow...`);
            const toBeText = await extractSectionWithAI(brdText, "Future State Vision");
            const sanitizedToBeText = sanitizeTextForFlowchart(toBeText);
            const bpmnXml = await generateBpmnFromProcessDescription(sanitizedToBeText, executiveSummary);
            generatedResults.tobeFlow = { type: 'bpmn', fileName: `${baseName}_To_Be_Flow.bpmn`, content: bpmnXml, contentType: 'application/xml' };
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
            generatedResults.anonymized = { type: 'zip', fileName: `${baseName}_Anonymized_Texts.zip`, content: zipBuffer.toString('base64'), contentType: 'application/zip' };
        }

        if (requestedArtifacts.includes('mapping')) {
            console.log(`[${reqId}] Creating consolidated redaction key...`);
            let csvContent = "Code,Original_Entity\n";
            for (let [code, original] of masterMapping.entries()) {
                csvContent += `${code},"${original.replace(/"/g, '""')}"\n`;
            }
            generatedResults.mapping = { type: 'csv', fileName: `${baseName}_Anonymized_Texts.zip`, content: Buffer.from(csvContent).toString('base64'), contentType: 'text/csv' };
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
