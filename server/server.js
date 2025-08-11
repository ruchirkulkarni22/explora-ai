// server/server.js
// This version is updated to generate BPMN 2.0 XML for process flows,
// enabling in-browser editing with bpmn-js on the frontend.
// QUALITY UPGRADE: Implemented a structured JSON-first approach and a more advanced
// layout algorithm for cleaner, more professional diagrams.
// NEW: Added a fallback mechanism to ask for more details if process descriptions are insufficient.
// OPTIMIZATION: Process flow generation (As-Is & To-Be) now runs in parallel to reduce waiting time.
// NEW: If BRD is not selected, flows will now trigger the refinement modal directly.
// DEPLOYMENT CHANGE: Removed local file system storage. Anonymization package is now generated in-memory and sent to the client.

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

// REMOVED: Temporary download directory and cleanup job are no longer needed
// as files are generated in-memory and sent directly to the client.

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

const PROCESS_TO_DRAWIO_XML_PROMPT = `You are an expert system that converts a business process description into a high-quality, simple, and clean Draw.io XML flowchart.

**PRIMARY GOAL:**
Your task is to create a high-quality, logical, and easy-to-follow flowchart that accurately represents the ENTIRE process described in the provided text. The output must be a single, valid Draw.io XML structure.

**CRITICAL RULES:**
1.  **XML ONLY:** Your entire response MUST be the XML code. Start with \`<mxfile ...>\` and end with \`</mxfile>\`. Do not include any other text, explanations, or markdown formatting.
2.  **STRICTLY ADHERE TO TEXT:** Base the flowchart ONLY on the provided process description. Do not invent steps or add information not present in the text.
3.  **INTELLIGENT SWIMLANES:** Use swimlanes ONLY if the process description explicitly mentions **more than one** distinct role, department, or system performing actions (e.g., 'Customer' submits, then 'System' validates). If the process describes actions by a single entity or doesn't specify roles, DO NOT use swimlanes.
4.  **NO DUPLICATION:** Never create duplicate nodes or nodes with synonymous meanings (e.g., "Submit Form" and "Form is Submitted"). Each step should be a unique node.
5.  **SHAPE AND TEXT FITTING:** Ensure text fits within shapes by using the style \`whiteSpace=wrap;html=1;\`. Make the shapes large enough to comfortably contain the text.
6.  **ERROR HANDLING:** If the provided text is too short, ambiguous, or completely insufficient to create a meaningful flowchart, you MUST return the following specific error XML. Inside the "value" attribute of the cell, provide a concise, user-friendly reason for the failure. Example:
\`<mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Error: The process is missing clear steps. Please describe the sequence of actions from start to finish." style="..." vertex="1" parent="1"><mxGeometry .../></mxCell></root></mxGraphModel></diagram></mxfile>\`

**STRICT LAYOUT & CONNECTION RULES:**
1.  **NO OVERLAPPING:** Under no circumstances should any elements (text, shapes, arrows) overlap. Ensure ample spacing between all elements for maximum clarity.
2.  **LOGICAL CONNECTIONS:** Every arrow must originate from one shape and connect directly and cleanly to the next logical shape in the sequence. Arrows should not cross over process boxes.
3.  **SWIMLANE INTEGRITY:** If swimlanes are used, every single process step (rectangles, rhombuses, etc.) MUST be placed entirely inside its corresponding swimlane. Do not place elements outside of their designated lane.

**TECHNICAL GUIDELINES:**
* **Canvas for PowerPoint:** The entire flowchart, including all shapes and swimlanes, must be contained within a bounding box suitable for a 16:9 widescreen slide (like PowerPoint). Assume a canvas size of approximately **1920 pixels wide by 1080 pixels high**. Distribute the elements evenly within this space to avoid cramping and ensure a professional, presentation-ready look.
* **Layout:** Arrange the flowchart in a clean top-to-bottom or left-to-right sequence. Use a grid layout. A good starting point for the first element is x="40", y="40". Use an increment of at least 160 for x or 120 for y to ensure spacing.
* **Elements:**
    * **Start Event:** Ellipse (\`style="ellipse;..."\`)
    * **End Event:** Ellipse with a thick border (\`style="ellipse;strokeWidth=2;..."\`)
    * **Task/Activity:** Rectangle (\`style="rounded=1;whiteSpace=wrap;html=1;"\`)
    * **Decision/Gateway:** Rhombus (\`style="rhombus;whiteSpace=wrap;html=1;"\`)
* **Connectors:** Use arrows to connect elements logically. Label connectors from a decision gateway (e.g., "Yes", "No").
* **IDs:** Each element (\`mxCell\`) must have a unique \`id\`, starting from \`id="2"\` for the first visible element.`;


// Prompt to intelligently extract a section from a document
const SECTION_EXTRACTOR_PROMPT = `You are an expert text analysis AI. Your task is to extract a specific section from the provided document.
The user will specify which section they want (e.g., "Current State", "Future Vision").
Analyze the document and return ONLY the full text content of that specific section, from the section header to the beginning of the next section.
Do not include the section header itself in your output. Do not add any commentary or explanation.
For example, if the document has a section "## 6. Current State Overview" followed by paragraphs, and the next section is "## 7. Future State Vision", you must return only the paragraphs under "Current State Overview".

The section to extract is: `;

// --- **NEW** PROMPT TO GET A SUMMARY FROM RAW TEXT ---
const SUMMARY_EXTRACTOR_PROMPT = `You are an expert text analysis AI. Your task is to read the following document(s) and generate a concise, one-paragraph executive summary. The summary should capture the main problem, the proposed solution, and the key objectives. Return ONLY the summary text.`;


// --- **NEW**: TEST CASE GENERATION PROMPT (Feature 2) ---
// --- FINAL - V4: DEDUPLICATION + CLARITY + FLEXIBILITY ---
const TEST_CASE_SYSTEM_PROMPT = `You are a world-class QA Lead with 20 years of experience in testing complex enterprise systems like Oracle Fusion and SAP.

Your task is to analyze a Business Requirements Document (BRD) — or any equivalent input such as user stories, solution design documents, UI mockups, or meeting notes — and generate a comprehensive, professional, and detailed set of test case scenarios. These test cases must be suitable for immediate execution by a manual tester and structured for import into a test management system.

CORE TASK:
For each functional requirement in the input, generate one or more complete test cases. Break each test case into granular test steps. Each test step must be output as a separate JSON object.

If a requirement is unclear or incomplete, make reasonable assumptions and include an additional key: "Note": "Clarification required".

OUTPUT FORMAT:
Your output must be a **single, valid JSON array**. Each object in the array represents **one test step** and must follow this exact structure:

{
  "Test Case ID": "<string>",
  "Module": "<string>",
  "Feature": "<string>",
  "Test Case Summary": "<string>",
  "Test Type": "<string>",
  "Priority": "<string>",
  "Prerequisites": "<string>",
  "Epic Link": "<string>",
  "Sprint": "<string>",
  "Step Number": 1,
  "Step Description": "<string>",
  "Test Data": "<string>",
  "Expected Result": "<string>"
}

Use this only as a **format guide**. The value "<string>" is provided strictly so you know the data type to be generated. Do not reuse any placeholder values. All field values must be fully derived from the BRD content. The JSON must contain only values relevant to the specific test scenario described in the input.

If assumptions were made due to missing BRD data, add an optional key:
"Note": "Clarification required"

CRITICAL QUALITY GUIDELINES:

1. PERSONA ADHERENCE:
   Think like a meticulous QA Lead. Your test cases should be highly structured, complete, and actionable.

2. NO GENERIC CONTENT:
   Avoid placeholders or vague instructions.
   - BAD: "Enter user data."
   - GOOD: "Enter First Name: John, Last Name: Doe, DOB: 1990-05-15"
   - BAD: "Verify the result."
   - GOOD: "Verify that the employee's status is 'Active - Payroll Eligible' and a confirmation email is sent to the manager."

3. SPECIFICITY IS KEY:
   - "Test Case ID": Use readable, traceable IDs like <MODULE>_<TYPE>_<SEQ>.
   - "Module" and "Feature": Derive from input accurately. Be specific (e.g., "Talent Management" not "HR").
   - "Test Data": Provide realistic values when input is needed.
   - "Expected Result": Must be observable and precise (UI state, messages, database effects, etc.).

4. COMPREHENSIVE COVERAGE:
   - **Positive Scenarios**: Cover all “happy path” flows.
   - **Negative Scenarios**: Include invalid inputs, permissions issues, incorrect formats.
   - **Edge Cases**: Include special characters, empty fields, large/small values, etc.
   - **Postconditions**: Add final verification steps that confirm system updates, status, or record creation.

5. ANTI-DUPLICATION RULE:
   - You MUST NOT generate duplicate or redundant test cases or steps.
   - A duplicate is any test step that matches another in **Test Case Summary**, **Step Description**, and **Expected Result**.
   - If a new requirement is only a slight variation, add it as a **negative** or **edge case** to the existing "Test Case ID" rather than creating a new one.
   - Continuously review already-conceptualized test cases before adding new ones.

6. STRUCTURE AND FORMAT:
   - JSON Only: Do not output anything except the valid JSON array.
   - One Step = One Object: A test case with 6 steps should produce 6 distinct JSON objects with the same metadata.
   - Use Exact Keys: Match field names **exactly**, including spaces and capitalization.
   - Do NOT include fields like "Actual Result", "Tester", "Defect ID", or "Execution Date".

Begin now. Output only the final JSON array of test steps. If no valid steps can be generated, return an empty array.
`;

// configuration settings for AI providers
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
        brdGenerationModel: 'qwen/qwen3-coder:free',
        flowGenerationModel: 'qwen/qwen3-coder:free',
        sectionExtractionModel: 'qwen/qwen3-coder:free',
        testCaseGenerationModel: 'qwen/qwen3-coder:free',
        apiBaseUrl: 'https://openrouter.ai/api/v1',
        siteUrl: 'http://localhost:3000',
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

// REMOVED: saveReferenceArchive is no longer needed.

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

// --- **NEW** AI Helper to generate a summary from raw text ---
const generateSummaryFromText = async (text) => {
    console.log(`Generating summary from raw text...`);
    const provider = aiConfig.sectionExtractionProvider; // Can reuse the same model
    const { apiKey, apiBaseUrl, sectionExtractionModel } = aiConfig[provider];

    const fullPrompt = `${SUMMARY_EXTRACTOR_PROMPT}\n\nDOCUMENT:\n${text}`;
    const apiUrl = `${apiBaseUrl}/${sectionExtractionModel}:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }] }) });
    
    if (!response.ok) throw new Error(`${provider} Summary Generation failed: ${response.statusText}`);
    const result = await response.json();
    const summaryText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summaryText || summaryText.trim().length < 10) {
        console.error("AI summary generation returned little or no content.");
        return "A summary could not be generated from the provided document.";
    }
    return summaryText;
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

const generateDrawioXmlFromProcessDescription = async (processDescription, contextSummary) => {
    const provider = aiConfig.flowGenerationProvider;
    console.log(`[LOG] Using provider: ${provider} for Draw.io XML generation.`);

    const fullPrompt = `${PROCESS_TO_DRAWIO_XML_PROMPT}\n\nExecutive Summary for context: ${contextSummary}\n\nProcess Description to convert: ${processDescription}`;

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

    const xmlMatch = rawResponse.match(/<mxfile[\s\S]*?<\/mxfile>/);
    const cleanedResponse = xmlMatch ? xmlMatch[0] : '';
    
    if (!cleanedResponse) {
        console.error("[ERROR] AI response for Draw.io XML did not contain a valid <mxfile> block. Raw response:", rawResponse);
        throw new Error("The AI failed to return a parsable Draw.io XML structure.");
    }

    if (cleanedResponse.includes('value="Error:')) {
        const errorMatch = cleanedResponse.match(/value="([^"]*)"/);
        const errorMessage = errorMatch ? errorMatch[1] : "The AI determined the process description was not detailed enough to create a flowchart.";
        console.warn(`[WARN] AI determined input was insufficient: ${errorMessage}`);
        return { error: "insufficient_content", message: errorMessage };
    }

    return cleanedResponse;
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
    console.log(`Intelligently Anonymizing provided documents..`);
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
