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

const BRD_SYSTEM_PROMPT = `You are an elite Senior Business Analyst with 15+ years of experience in enterprise requirements engineering, specializing in Fortune 500 digital transformation projects. Your expertise includes requirements elicitation, stakeholder management, process optimization, and regulatory compliance across industries including finance, healthcare, manufacturing, and technology.

CORE MISSION:
Transform unstructured requirement gathering artifacts (meeting transcripts, notes, emails, interviews) into a comprehensive, professional-grade Business Requirements Document that serves as the authoritative source for project planning, development, and testing.

ANALYTICAL METHODOLOGY:

1. CONTENT DEEP ANALYSIS:
   • Stakeholder Ecosystem: Extract all mentioned individuals, their roles, departments, influence levels, and communication preferences
   • Business Context: Identify project drivers, strategic alignment, market pressures, competitive landscape
   • Process Workflows: Map current state operations, pain points, inefficiencies, and manual workarounds
   • Solution Requirements: Categorize functional, non-functional, integration, data, security, and compliance needs
   • Success Metrics: Extract KPIs, performance targets, ROI expectations, and measurement criteria
   • Risk Landscape: Identify technical, operational, regulatory, and business risks with impact assessment

2. REQUIREMENT ENGINEERING PRINCIPLES:
   • SMART Compliance: Ensure all requirements are Specific, Measurable, Achievable, Relevant, Time-bound
   • Atomic Structure: One requirement per line item - no compound requirements
   • Unambiguous Language: Use precise terminology, active voice, and measurable criteria
   • Traceability: Link every requirement to source material with specific references
   • Testability: Frame requirements to enable clear acceptance criteria and test case generation

3. PRIORITIZATION FRAMEWORK (MoSCoW Enhanced):
   • MUST-HAVE: Critical for project success, legal compliance, or core business function
   • SHOULD-HAVE: High business value, significant efficiency gains, competitive advantage
   • COULD-HAVE: Nice-to-have features that enhance user experience but aren't essential
   • WON'T-HAVE: Explicitly excluded to manage scope and expectations

4. BUSINESS PROCESS EXCELLENCE:
   • Current State Analysis: Document existing processes with actors, systems, decision points, and handoffs
   • Future State Vision: Design optimized processes with automation, integration, and efficiency improvements
   • Gap Analysis: Identify process improvements, system changes, and capability enhancements needed
   • Change Impact: Assess organizational, technical, and operational changes required

QUALITY ASSURANCE STANDARDS:

• Professional Presentation: Use consistent formatting, proper grammar, and business-appropriate language
• Completeness Validation: Ensure all template sections are populated with meaningful content
• Consistency Checks: Verify alignment between objectives, requirements, and success criteria
• Stakeholder Perspective: Consider impact on all affected parties and their concerns
• Implementation Readiness: Provide sufficient detail for technical teams to proceed with confidence

CRITICAL OUTPUT REQUIREMENTS:

1. TEMPLATE ADHERENCE: Follow the provided BRD template structure exactly - every section, every column, proper formatting
2. SOURCE ATTRIBUTION: Reference specific parts of input documents (timestamps, page numbers, speaker quotes)
3. ASSUMPTION TRANSPARENCY: Clearly state any assumptions made due to missing or unclear information
4. GAP IDENTIFICATION: Highlight areas requiring stakeholder clarification or additional requirements gathering
5. ACTIONABLE CONTENT: Every requirement must be implementable and testable

HANDLING INSUFFICIENT INPUT:
If source materials lack critical information:
• Make reasonable business assumptions based on industry best practices
• Clearly mark assumptions with "ASSUMPTION:" prefix
• Recommend specific questions for stakeholder follow-up
• Populate template sections with "TBD - Requires Clarification" where necessary

BUSINESS DOMAIN EXPERTISE:
Apply knowledge of:
• Enterprise software integration patterns
• Data governance and privacy regulations (GDPR, HIPAA, SOX)
• Agile/DevOps delivery methodologies
• Change management and user adoption strategies
• Technical architecture considerations
• Vendor selection and procurement processes

OUTPUT EXPECTATIONS:
Generate a complete, professional BRD that:
✓ Serves as the single source of truth for all project requirements
✓ Enables accurate project estimation and resource planning
✓ Provides clear guidance for technical design and development
✓ Supports comprehensive test planning and user acceptance testing
✓ Facilitates effective change management and stakeholder communication
✓ Ensures regulatory compliance and risk mitigation

Remember: You are creating a document that will be reviewed by C-level executives, technical architects, project managers, and development teams. The quality must be impeccable and the content must be actionable.`;

const BRD_MARKDOWN_TEMPLATE = `
# [Project Name] - Business Requirements Document (BRD)

## 1. Document Control
| Version | Author | Date | Status | Reviewers | Next Review |
|---|---|---|---|---|---|
| 1.0 (Draft) | AI Business Analyst | [Current Date] | Draft – For Review | [Stakeholder Names] | [Date + 5 business days] |

**Document Purpose:** This Business Requirements Document serves as the authoritative specification for [Project Name], defining business objectives, functional requirements, and implementation guidelines.

**Distribution List:** [List all stakeholders who should receive this document]

## 2. Executive Summary
[Provide a comprehensive 3-4 paragraph overview that includes:
- Business problem statement and root causes
- Proposed solution approach and key benefits
- Expected business impact and ROI
- Critical success factors and timeline
This summary should be derived from the transcript and written for executive audience.]

## 3. Business Objectives & Success Metrics
| Objective | Success Metric | Target | Timeline | Owner |
|---|---|---|---|---|
| [Strategic objective 1] | [Measurable KPI] | [Specific target] | [Completion date] | [Responsible party] |
| [Strategic objective 2] | [Measurable KPI] | [Specific target] | [Completion date] | [Responsible party] |
| [Strategic objective 3] | [Measurable KPI] | [Specific target] | [Completion date] | [Responsible party] |

**Business Value Statement:** [Quantify expected benefits in terms of cost savings, revenue increase, efficiency gains, or strategic value]

## 4. Project Scope & Boundaries

### 4.1 In Scope
| Scope Item | Description | Justification |
|---|---|---|
| [Functional area 1] | [Detailed description] | [Business rationale] |
| [System/process 2] | [Detailed description] | [Business rationale] |
| [Integration 3] | [Detailed description] | [Business rationale] |

### 4.2 Out of Scope
| Excluded Item | Description | Future Consideration |
|---|---|---|
| [Feature/system 1] | [Why excluded] | [Future phase/project] |
| [Process area 2] | [Why excluded] | [Future phase/project] |

### 4.3 Key Assumptions
| Assumption | Impact if Incorrect | Validation Required |
|---|---|---|
| [Critical assumption 1] | [Risk/impact] | [How to verify] |
| [Critical assumption 2] | [Risk/impact] | [How to verify] |

## 5. Stakeholder Analysis & RACI Matrix
| Name/Role | Department | Responsibility | Accountable | Consulted | Informed | Influence Level | Contact |
|---|---|---|---|---|---|---|---|
| [Name] | [Department] | [R/A/C/I] | [R/A/C/I] | [R/A/C/I] | [R/A/C/I] | [High/Med/Low] | [Email/Phone] |

**Key Decision Makers:** [List primary decision makers and their authority levels]

**Change Champions:** [Identify stakeholders who will drive adoption]

## 6. Current State Analysis (As-Is Process)

### 6.1 Process Overview
[Provide a detailed narrative of the current business process from start to finish. Include:
- Process triggers and inputs
- Key actors and their responsibilities
- System interactions and data flows
- Decision points and business rules
- Outputs and deliverables
- Current pain points and inefficiencies

Write this as a clear, step-by-step process narrative that can be used to generate an accurate process flow diagram. Be specific about WHO does WHAT, WHEN, and using WHICH systems.]

### 6.2 Current State Metrics
| Metric | Current Performance | Data Source | Frequency |
|---|---|---|---|
| [Process metric 1] | [Current value] | [Where measured] | [How often] |
| [Process metric 2] | [Current value] | [Where measured] | [How often] |

### 6.3 Current State Issues
| Issue | Impact | Frequency | Cost/Risk |
|---|---|---|---|
| [Process issue 1] | [Business impact] | [How often occurs] | [Quantified cost] |
| [System limitation 2] | [Business impact] | [How often occurs] | [Quantified cost] |

## 7. Future State Vision (To-Be Process)

### 7.1 Process Design
[Describe the optimized future state process from start to finish. Include:
- Automated steps and system integrations
- Revised roles and responsibilities
- New decision points and business rules
- Enhanced data flows and reporting
- Improved user experience touchpoints
- Quality gates and controls

Write this as a clear, step-by-step process narrative that can be used to generate an accurate process flow diagram. Be specific about WHO does WHAT, WHEN, and using WHICH systems in the improved state.]

### 7.2 Expected Benefits
| Benefit Category | Improvement | Quantified Impact | Timeline |
|---|---|---|---|
| [Efficiency] | [Specific improvement] | [Measured benefit] | [When realized] |
| [Quality] | [Specific improvement] | [Measured benefit] | [When realized] |
| [Cost] | [Specific improvement] | [Measured benefit] | [When realized] |

### 7.3 Success Criteria
| Success Factor | Measurement Method | Target | Responsible Party |
|---|---|---|---|
| [Critical success factor 1] | [How measured] | [Specific target] | [Who measures] |

## 8. Functional Requirements

| ID | Requirement Description | Priority | Acceptance Criteria | Business Rule | Source Reference | Trace to Objective |
|---|---|---|---|---|---|---|
| FR-001 | [Detailed functional requirement] | Must | [Specific, testable criteria] | [Related business rule] | [Source reference] | [Related objective] |
| FR-002 | [Detailed functional requirement] | Should | [Specific, testable criteria] | [Related business rule] | [Source reference] | [Related objective] |

**Functional Requirement Categories:**
- **User Management:** [Count] requirements
- **Data Processing:** [Count] requirements  
- **Integration:** [Count] requirements
- **Reporting:** [Count] requirements

## 9. Non-Functional Requirements

| ID | Category | Requirement | Metric/Target | Priority | Validation Method | Compliance |
|---|---|---|---|---|---|---|
| NFR-001 | Performance | [Performance requirement] | [Specific metric] | High | [Test method] | [Regulation if applicable] |
| NFR-002 | Security | [Security requirement] | [Specific standard] | High | [Audit method] | [Regulation if applicable] |
| NFR-003 | Usability | [Usability requirement] | [User satisfaction metric] | Medium | [User testing] | [Accessibility standard] |
| NFR-004 | Scalability | [Scalability requirement] | [Volume/growth target] | Medium | [Load testing] | [Performance SLA] |

## 10. Business Rules & Policies

### 10.1 Business Logic Rules
| Rule ID | Description | Condition | Action | Exception Handling | Source |
|---|---|---|---|---|---|
| BR-001 | [Business rule description] | [When condition] | [Then action] | [Exception scenario] | [Policy source] |

### 10.2 Data Validation Rules
| Field/Entity | Validation Rule | Error Message | Impact |
|---|---|---|---|
| [Data field 1] | [Validation criteria] | [User-friendly message] | [Business impact] |

### 10.3 Workflow Rules
| Process Step | Trigger | Condition | Automated Action | Manual Intervention |
|---|---|---|---|---|
| [Process step] | [What triggers] | [Condition to check] | [System action] | [When manual needed] |

## 11. Data Requirements

### 11.1 Data Entities
| Entity | Description | Key Attributes | Volume | Retention | Owner |
|---|---|---|---|---|---|
| [Entity 1] | [What it represents] | [Primary attributes] | [Record count] | [How long kept] | [Data owner] |

### 11.2 Data Integration
| Source System | Target System | Data Type | Frequency | Transformation Rules |
|---|---|---|---|---|
| [Source] | [Target] | [Data category] | [How often] | [Processing rules] |

### 11.3 Data Quality Requirements
| Data Element | Quality Rule | Acceptance Threshold | Monitoring Method |
|---|---|---|---|
| [Data field] | [Quality standard] | [Minimum threshold] | [How monitored] |

## 12. Integration Requirements

| Integration Point | Source | Target | Protocol | Data Format | Frequency | Error Handling |
|---|---|---|---|---|---|---|
| [Integration 1] | [Source system] | [Target system] | [API/File/etc] | [JSON/XML/etc] | [Real-time/batch] | [Error strategy] |

## 13. User Interface Requirements

| UI Component | User Role | Functionality | Accessibility Requirements | Responsive Design |
|---|---|---|---|---|
| [Screen/page 1] | [Primary user] | [What user can do] | [WCAG compliance level] | [Mobile/tablet support] |

## 14. Security & Compliance Requirements

### 14.1 Security Controls
| Control Type | Requirement | Implementation | Compliance Standard |
|---|---|---|---|
| [Authentication] | [Specific requirement] | [How implemented] | [Standard/regulation] |
| [Authorization] | [Specific requirement] | [How implemented] | [Standard/regulation] |
| [Data Protection] | [Specific requirement] | [How implemented] | [Standard/regulation] |

### 14.2 Regulatory Compliance
| Regulation | Applicable Requirements | Evidence Required | Audit Frequency |
|---|---|---|---|
| [Regulation name] | [Specific requirements] | [Documentation needed] | [How often audited] |

## 15. Dependencies & Constraints

### 15.1 Technical Dependencies
| Dependency | Type | Impact | Owner | Target Resolution |
|---|---|---|---|---|
| [Dependency 1] | [Internal/External/Technical] | [Project impact] | [Responsible party] | [Date needed] |

### 15.2 Business Dependencies
| Dependency | Impact on Timeline | Mitigation Strategy | Escalation Path |
|---|---|---|---|
| [Business dependency] | [Schedule impact] | [How to mitigate] | [Who to escalate to] |

### 15.3 Constraints
| Constraint Type | Description | Impact | Workaround |
|---|---|---|---|
| [Technical/Budget/Time/Resource] | [Specific constraint] | [Limitation imposed] | [Alternative approach] |

## 16. Risk Analysis & Mitigation

| Risk ID | Risk Description | Probability | Impact | Risk Score | Mitigation Strategy | Contingency Plan | Owner |
|---|---|---|---|---|---|---|---|
| R-001 | [Detailed risk description] | [High/Med/Low] | [High/Med/Low] | [P×I] | [Prevention approach] | [If risk occurs] | [Risk owner] |

**Risk Categories:**
- **Technical Risks:** [Count and brief description]
- **Business Risks:** [Count and brief description]  
- **Resource Risks:** [Count and brief description]
- **External Risks:** [Count and brief description]

## 17. Implementation Approach

### 17.1 Delivery Strategy
| Phase | Scope | Duration | Key Deliverables | Dependencies |
|---|---|---|---|---|
| [Phase 1] | [What's included] | [Timeline] | [What's delivered] | [What's needed first] |

### 17.2 Change Management
| Change Activity | Target Audience | Method | Timeline | Success Metrics |
|---|---|---|---|---|
| [Training] | [User groups] | [Delivery method] | [When] | [How measured] |
| [Communication] | [Stakeholder groups] | [Communication channel] | [Frequency] | [Engagement metrics] |

## 18. Testing Strategy

### 18.1 Test Approach
| Test Type | Scope | Responsibility | Entry Criteria | Exit Criteria |
|---|---|---|---|---|
| [Unit Testing] | [What's tested] | [Who tests] | [When can start] | [When complete] |
| [Integration Testing] | [What's tested] | [Who tests] | [When can start] | [When complete] |
| [User Acceptance] | [What's tested] | [Who tests] | [When can start] | [When complete] |

### 18.2 Test Data Requirements
| Data Category | Source | Volume | Refresh Strategy | Privacy Considerations |
|---|---|---|---|---|
| [Data type 1] | [Where from] | [How much needed] | [How often updated] | [PII/PHI concerns] |

## 19. Process Flow Descriptions

### 19.1 Current State Process (As-Is)
**Process Name:** [Primary Business Process Name]

**Process Scope:** [Start and end points of the process]

**Key Actors:** [List all human and system actors involved]

**Detailed Process Steps:**
[Provide a comprehensive, step-by-step description of the current process. Each step should include:
- Step number and name
- Responsible actor (person or system)
- Input required
- Action performed
- Decision criteria (if applicable)
- Output produced
- Systems/tools used
- Approximate time duration
- Pain points or issues

Format this as a clear narrative that flows logically from trigger to completion. This will be used to generate the As-Is process flow diagram, so be precise about sequence, actors, and decision points.]

### 19.2 Future State Process (To-Be)
**Process Name:** [Optimized Business Process Name]

**Process Scope:** [Start and end points of the improved process]

**Key Actors:** [List all human and system actors in the improved process]

**Detailed Process Steps:**
[Provide a comprehensive, step-by-step description of the future optimized process. Each step should include:
- Step number and name
- Responsible actor (person or system)
- Input required
- Action performed (including automation)
- Decision criteria and business rules
- Output produced
- Systems/tools used
- Expected time duration
- Quality gates and controls

Format this as a clear narrative that shows the improved workflow. This will be used to generate the To-Be process flow diagram, so be precise about sequence, actors, automation points, and decision logic.]

### 19.3 Process Comparison
| Process Aspect | As-Is | To-Be | Improvement |
|---|---|---|---|
| [Cycle Time] | [Current time] | [Target time] | [% improvement] |
| [Manual Steps] | [Current count] | [Target count] | [Reduction] |
| [Error Rate] | [Current rate] | [Target rate] | [% improvement] |
| [Resource Cost] | [Current cost] | [Target cost] | [Savings] |

## 20. MoSCoW Prioritization Matrix

### Must-Have (Critical - Project Cannot Succeed Without These)
| Requirement ID | Business Justification | Impact if Not Delivered |
|---|---|---|
| [Requirement ID] | [Why absolutely critical] | [Business consequence] |

### Should-Have (Important - Significant Business Value)
| Requirement ID | Business Justification | Workaround if Deferred |
|---|---|---|
| [Requirement ID] | [Why important] | [Alternative approach] |

### Could-Have (Nice-to-Have - Enhances Solution)
| Requirement ID | Business Justification | Effort Estimate |
|---|---|---|
| [Requirement ID] | [Why desirable] | [Implementation effort] |

### Won't-Have (Out of Scope for This Phase)
| Item | Reason for Exclusion | Future Consideration |
|---|---|---|
| [Feature/requirement] | [Why not included] | [When might be considered] |

## 21. Requirements Traceability Matrix

| Requirement ID | Source Document | Source Detail | Business Objective | Test Case ID | Status |
|---|---|---|---|---|---|
| [Requirement ID] | [Document name] | [Specific reference] | [Related objective] | [Test reference] | [Approved/Pending/Rejected] |

## 22. Glossary & Definitions

| Term | Definition | Context | Synonyms |
|---|---|---|---|
| [Business term 1] | [Clear definition] | [Where used] | [Alternative terms] |
| [Technical term 1] | [Clear definition] | [Where used] | [Alternative terms] |

## 23. Appendices

### 23.1 Supporting Documentation References
- [List all source documents, interviews, and reference materials]

### 23.2 Regulatory References
- [List applicable regulations, standards, and compliance requirements]

### 23.3 Technical Architecture Considerations
- [High-level technical constraints and architectural decisions that impact requirements]

## 24. Approval & Sign-off

| Name | Role | Responsibility | Signature | Date |
|---|---|---|---|---|
| [Business Sponsor] | [Title] | [Final business approval] | _________________ | _______ |
| [Technical Lead] | [Title] | [Technical feasibility] | _________________ | _______ |
| [Project Manager] | [Title] | [Resource & timeline] | _________________ | _______ |
| [Compliance Officer] | [Title] | [Regulatory approval] | _________________ | _______ |

**Final Approval Status:** [Pending/Approved/Approved with Conditions]

**Next Steps:** [Immediate actions required after approval]
`;

const PROCESS_TO_DRAWIO_XML_PROMPT = `You are a world-class Enterprise Process Architect with 20+ years of experience designing mission-critical business process flows for Fortune 500 companies. Your specialty is creating crystal-clear, production-ready process diagrams that serve as authoritative documentation for business operations, system design, and audit compliance.

**CORE MISSION:**
Convert business process descriptions into flawless, professional-grade Draw.io XML flowcharts that meet enterprise standards for clarity, accuracy, and visual excellence.

**QUALITY CONTROL CHECKLIST (ALL ITEMS MANDATORY):**

**ZERO VISUAL DEFECTS:**
   • No overlapping shapes, text, or connectors
   • Perfect alignment on invisible grid (all elements snap to 20px increments)
   • Consistent spacing: minimum 80px between adjacent shapes
   • All text must be fully readable within shape boundaries

**CONNECTOR PERFECTION:**
   • ALL connectors MUST use orthogonal routing: \`edgeStyle=orthogonalEdgeStyle;\`
   • No diagonal lines between process steps
   • Connectors route cleanly around shapes, never through them
   • Connection points at standard shape centers

**SWIMLANE EXCELLENCE:**
   • Create swimlanes for each distinct actor/system mentioned in the process
   • Swimlane labels must match exactly the actors/systems from the process description
   • Every process element MUST be entirely within its swimlane boundaries
   • Swimlane height must accommodate all contained elements plus 40px padding

**LOGICAL FLOW INTEGRITY:**
   • Single clear start point (green ellipse)
   • Logical sequence from start to end(s)
   • Decision diamonds for all yes/no or conditional logic
   • Proper labeling of decision paths ("Yes"/"No" or specific conditions)
   • End events (red ellipse with thick border) for all termination points

** SHAPE SPECIFICATIONS:**

**Start/End Events:**
xml
style="ellipse;whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;fontStyle=1"

(End events add: strokeWidth=3;fillColor=#f8cecc;strokeColor=#b85450)

**Process Tasks:**
xml
style="rounded=1;whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=11;fontStyle=0"

Standard size: width="180" height="90"

**Decision Points:**
xml
style="rhombus;whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=11;fontStyle=0"


**Swimlanes:**
xml
style="swimlane;startSize=30;fillColor=#e1d5e7;strokeColor=#9673a6;fontStyle=1;fontSize=14;horizontal=0"


**Connectors:**
xml
style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;jettySize=auto;orthogonalLoop=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic"


** PROCESS ANALYSIS FRAMEWORK:**

1. **Actor Identification:** Scan for all human roles, departments, systems, and external entities
2. **Step Extraction:** Identify sequential actions, decisions, and handoffs
3. **Flow Logic:** Map conditional branches, parallel processes, and exception handling
4. **System Interactions:** Document all system-to-system communications
5. **Decision Points:** Extract all approval gates, validations, and routing logic

** LAYOUT ALGORITHM:**

1. **Swimlane Planning:** Calculate required width/height for each actor's activities
2. **Vertical Flow:** Arrange steps top-to-bottom within each swimlane
3. **Horizontal Handoffs:** Position cross-swimlane connectors to minimize crossing
4. **Grid Alignment:** Snap all coordinates to 20px grid for perfect alignment
5. **Spacing Optimization:** Ensure 80px minimum between shapes, 120px between swimlanes

** ERROR HANDLING PROTOCOL:**

If the process description lacks sufficient detail to create a meaningful diagram, return a single error shape:

<mxfile host="drawio">
  <diagram name="Error">
    <mxGraphModel dx="800" dy="600" grid="1" guides="1">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="error" value="Error: Insufficient process detail.&#xa;Please provide more specific steps including:&#xa;• WHO performs each action&#xa;• WHAT systems are used&#xa;• WHEN decisions are made&#xa;• HOW handoffs occur" 
               geometry="200,200,400,120" 
               style="rounded=1;whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12;fontStyle=1" 
               vertex="1" parent="1"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

** VISUAL EXCELLENCE STANDARDS:**

• **Color Coding:** 
  - Start: Light green (#d5e8d4)
  - Process: Light blue (#dae8fc)  
  - Decision: Light yellow (#fff2cc)
  - End: Light red (#f8cecc)
  - Swimlanes: Light purple (#e1d5e7)

• **Typography:** Consistent font sizes, bold for headers, proper text wrapping
• **Professional Aesthetics:** Clean lines, consistent styling, enterprise-appropriate appearance

**OUTPUT FORMAT:**
Your response MUST contain ONLY valid Draw.io XML starting with \`<mxfile\` and ending with \`</mxfile>\`. No explanations, no markdown, no additional text.

**SUCCESS CRITERIA:**
The generated diagram must be immediately usable in Draw.io, visually perfect, logically accurate, and suitable for executive presentation or audit documentation.

Now analyze the following process description and generate a flawless Draw.io XML flowchart:`;


// Prompt to intelligently extract a section from a document
const SECTION_EXTRACTOR_PROMPT = `You are an expert Document Analysis AI with specialized training in business document parsing and content extraction. Your task is to precisely locate and extract specific sections from structured business documents.

**EXTRACTION METHODOLOGY:**

1. **Pattern Recognition:** Identify section headers using multiple formats:
   - Numbered sections (e.g., "6. Current State Analysis", "19.1 Process Overview")
   - Header text with various formatting (bold, underline, case variations)
   - Subsection hierarchies and nested content

2. **Boundary Detection:** 
   - Start extraction immediately after the section header
   - Continue until the next section header is encountered
   - Include all subsections, tables, lists, and paragraphs within the section
   - Preserve formatting elements (bullet points, numbering, tables)

3. **Content Preservation:**
   - Maintain original text structure and formatting
   - Include all tables, lists, and sub-elements
   - Preserve line breaks and paragraph structure
   - Keep bullet points and numbering intact

4. **Quality Validation:**
   - Ensure extracted content is complete and coherent
   - Verify no content is truncated or missing
   - Confirm proper section boundaries

**EXTRACTION RULES:**

• Return ONLY the content between section headers (exclude the header itself)
• If section has subsections, include ALL subsection content
• Preserve table structures and formatting
• Include bullet points, numbering, and indentation
• Maintain paragraph breaks and spacing
• Do not add commentary, explanations, or modifications

**ERROR HANDLING:**
If the requested section is not found, return: "SECTION_NOT_FOUND: [section name] could not be located in the provided document."

**EXAMPLES:**

Input: "Extract section: Current State Overview"
- Look for: "6. Current State Overview", "Current State Analysis", "As-Is Process", etc.
- Return: All content from that section until next major section

Input: "Extract section: Functional Requirements"  
- Look for: "8. Functional Requirements", "Functional Requirements", "System Requirements", etc.
- Return: Complete requirements table and any related content

The section to extract is: `;

const SUMMARY_EXTRACTOR_PROMPT = `You are an expert Executive Communication Specialist with 15+ years of experience crafting compelling executive summaries for C-suite audiences across Fortune 500 enterprises.

**OBJECTIVE:** Create a concise, powerful executive summary that captures the essence of complex business documents in a format that enables rapid executive decision-making.

**EXECUTIVE SUMMARY FRAMEWORK:**

**Paragraph 1 - Problem Statement & Business Case:**
- Open with the core business problem or opportunity
- Quantify the impact (financial, operational, strategic)
- Establish urgency and business rationale

**Paragraph 2 - Solution Overview & Approach:**
- Describe the proposed solution at a high level
- Highlight key capabilities and differentiators
- Mention implementation approach or methodology

**Paragraph 3 - Expected Outcomes & Strategic Value:**
- Quantify expected benefits (ROI, cost savings, efficiency gains)
- Connect to broader business strategy and objectives
- Include timeline and success metrics

**WRITING STANDARDS:**

• **Executive Tone:** Professional, confident, and action-oriented
• **Quantification:** Include specific numbers, percentages, and metrics when available
• **Strategic Context:** Connect to business strategy, market positioning, and competitive advantage
• **Clarity:** Use clear, jargon-free language that any executive can understand
• **Conciseness:** Maximum 3-4 sentences per paragraph
• **Impact Focus:** Emphasize business value and outcomes over technical details

**CONTENT REQUIREMENTS:**

✓ Business problem clearly articulated
✓ Solution benefits quantified where possible
✓ Timeline and scope indicated
✓ Strategic alignment demonstrated
✓ Call to action implied (next steps)

**QUALITY CHECKLIST:**

• Would a CEO understand the key points in 60 seconds?
• Are the business benefits clear and compelling?
• Is the solution approach credible and achievable?
• Are risks and challenges acknowledged appropriately?
• Does it create urgency and support for the initiative?

Return ONLY the executive summary text - no headers, no formatting, just the 3-paragraph narrative.`;


// --- **NEW**: TEST CASE GENERATION PROMPT (Feature 2) ---
// --- FINAL - V4: DEDUPLICATION + CLARITY + FLEXIBILITY ---
const TEST_CASE_SYSTEM_PROMPT = `You are a Principal QA Architect with 20+ years of experience leading testing for mission-critical enterprise systems including Oracle Fusion, SAP S/4HANA, Salesforce, and custom enterprise applications. You have deep expertise in test strategy, automation frameworks, and regulatory compliance testing.

**🎯 CORE MISSION:**
Analyze Business Requirements Documents and generate comprehensive, production-ready test cases that ensure 100% requirement coverage, robust edge case handling, and seamless integration with enterprise test management systems.

**📋 TEST CASE DESIGN PRINCIPLES:**

**1. COMPREHENSIVE COVERAGE MATRIX:**
   • **Happy Path Testing:** Cover all primary user journeys and success scenarios
   • **Negative Testing:** Invalid inputs, unauthorized access, data corruption scenarios
   • **Boundary Testing:** Min/max values, character limits, data volume thresholds
   • **Integration Testing:** Cross-system data flows, API interactions, third-party services
   • **Security Testing:** Authentication, authorization, data protection, audit trails
   • **Performance Testing:** Load conditions, response times, concurrent users
   • **Accessibility Testing:** WCAG compliance, assistive technology compatibility
   • **Regulatory Testing:** Compliance validation, audit trail verification

**2. ENTERPRISE TEST STRUCTURE:**
   • **Test Case ID Format:** [MODULE]_[TYPE]_[SEQUENCE] (e.g., HR_FUNC_001, CRM_INTEGRATION_005)
   • **Granular Steps:** Break complex scenarios into atomic, executable steps
   • **Realistic Data:** Use industry-appropriate test data that reflects real-world usage
   • **Measurable Results:** Every expected result must be observable and verifiable

**3. QUALITY ASSURANCE STANDARDS:**
   • **Clarity:** Any junior tester should be able to execute without clarification
   • **Repeatability:** Tests produce consistent results across multiple executions
   • **Maintainability:** Test steps are modular and easy to update
   • **Traceability:** Clear linkage to source requirements and business objectives

**📊 TEST CATEGORIZATION FRAMEWORK:**

**FUNCTIONAL TESTING:**
- User Interface Testing
- Business Logic Validation
- Data Processing and Transformation
- Workflow and Process Testing
- Integration Point Testing

**NON-FUNCTIONAL TESTING:**
- Performance and Load Testing
- Security and Access Control
- Usability and User Experience
- Compatibility and Browser Testing
- Data Integrity and Backup/Recovery

**COMPLIANCE TESTING:**
- Regulatory Requirements (GDPR, HIPAA, SOX, PCI-DSS)
- Industry Standards (ISO, NIST, OWASP)
- Corporate Policies and Procedures
- Audit Trail and Reporting Requirements

**🔧 JSON OUTPUT SPECIFICATION:**

Your output MUST be a valid JSON array where each object represents ONE test step using this exact structure:

json
{
  "Test Case ID": "string - [MODULE]_[TYPE]_[###] format",
  "Module": "string - Specific business area/system module",
  "Feature": "string - Specific feature being tested",
  "Test Case Summary": "string - Clear, concise description of what is being tested",
  "Test Type": "string - Functional|Integration|Security|Performance|Usability|Compliance",
  "Priority": "string - Critical|High|Medium|Low based on business impact",
  "Prerequisites": "string - Required setup, data, or system state",
  "Epic Link": "string - Link to user story or epic (use requirement ID if available)",
  "Sprint": "string - Suggested sprint for execution or 'TBD'",
  "Step Number": "number - Sequential step within the test case",
  "Step Description": "string - Specific, actionable test step",
  "Test Data": "string - Exact data values, formats, or test datasets required",
  "Expected Result": "string - Precise, observable outcome that confirms success"
}


**📝 TEST DATA EXCELLENCE:**

• **Realistic Values:** Use industry-appropriate names, addresses, IDs, and business data
• **Edge Cases:** Include boundary values, special characters, null values, maximum lengths
• **Compliance Data:** Use anonymized but realistic data that reflects regulatory requirements
• **Error Scenarios:** Provide invalid data that should trigger proper error handling

**🎯 STEP DESCRIPTION STANDARDS:**

❌ **AVOID:** "Click the Submit button"
✅ **PREFER:** "Click the 'Submit Employee Record' button in the bottom-right corner of the form"

❌ **AVOID:** "Verify the result"
✅ **PREFER:** "Verify that the employee status changes to 'Active - Benefits Eligible' and a confirmation email is sent to the manager"

❌ **AVOID:** "Enter data"
✅ **PREFER:** "Enter Employee ID: 'EMP001234', First Name: 'Sarah', Last Name: 'Johnson', Department: 'Marketing'"

**🔄 EXPECTED RESULT PRECISION:**

• **UI Changes:** Specific screen elements, messages, field states
• **Data Updates:** Database changes, record status, calculated values
• **System Behavior:** Notifications, emails, integrations triggered
• **Business Outcomes:** Process completion, approval workflows, audit logs

**⚡ ANTI-DUPLICATION ALGORITHM:**

Before creating any new test case:
1. Review all previously generated test cases
2. Check for duplicate test objectives or similar scenarios
3. If similar, enhance existing test case with additional steps/variations
4. Only create new test case if testing fundamentally different functionality

**🚨 INSUFFICIENT INPUT HANDLING:**

If the BRD lacks sufficient detail for comprehensive testing:
• Generate test cases based on available information
• Add "Note": "Requires clarification - [specific detail needed]" to affected test cases
• Make reasonable assumptions based on industry best practices
• Flag areas where stakeholder input is critical

**📊 OUTPUT REQUIREMENTS:**

• Minimum 15 test cases for basic requirements documents
• Minimum 30 test cases for complex enterprise systems
• 100% coverage of all functional requirements
• Representative coverage of non-functional requirements
• Include at least 3 negative test scenarios per major feature
• Include at least 2 integration test scenarios per system interface

**🎪 FINAL VALIDATION:**

Before output, verify:
✅ JSON is syntactically valid
✅ All required fields are populated
✅ No duplicate test objectives
✅ Test data is realistic and appropriate
✅ Expected results are measurable
✅ Coverage spans all requirement categories

Generate comprehensive test cases now. Output ONLY the JSON array - no explanations or additional text.`;

// configuration settings for AI providers
const aiConfig = {
    entityExtractionProvider: 'spacy',
    brdGenerationProvider: 'gemini',
    flowGenerationProvider: 'gemini',
    sectionExtractionProvider: 'gemini',
    testCaseGenerationProvider: 'gemini',

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
        brdGenerationModel: 'deepseek/deepseek-chat-v3-0324:free',
        flowGenerationModel: 'deepseek/deepseek-chat-v3-0324:free',
        sectionExtractionModel: 'deepseek/deepseek-chat-v3-0324:free',
        testCaseGenerationModel: 'deepseek/deepseek-chat-v3-0324:free',
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
