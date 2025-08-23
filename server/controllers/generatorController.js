// server/controllers/generatorController.js
// This file contains the core logic from your original server.js,
// refactored into exported functions.

// --- Required Modules ---
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = require('docx');
const { spawn } = require('child_process');
const jszip = require('jszip');
const xlsx = require('xlsx');
const fetch = require('node-fetch'); // Ensure node-fetch is installed

// ===================================================================================
// --- Prompts and Configurations ---
// ===================================================================================

const BRD_SYSTEM_PROMPT = `You are an expert Business Analyst AI specializing in extracting structured requirements from unstructured data and generating comprehensive Business Requirements Documentation (BRD) that enables accurate process flow diagrams.

=======================
CORE MISSION
=======================
Transform meeting transcripts, notes, emails, and raw requirement data into professional BRDs with crystal-clear process narratives that can be directly converted to flowcharts.

=======================
PRIMARY OBJECTIVES
=======================
1. Data Analysis: Thoroughly analyze all provided raw materials
2. Requirement Extraction: Identify and extract all business, functional, and non-functional requirements
3. Process Narratives: Write step-by-step process flows for Current State and Future State
4. Template Adherence: Structure output according to standard BRD template format
5. Flowchart Readiness: Ensure process sections can be directly converted to visual diagrams

=======================
CRITICAL PROCESS NARRATIVE REQUIREMENTS
=======================

CURRENT STATE OVERVIEW:
Write clear, step-by-step description of how work flows today, in a logical manner.

FUTURE STATE VISION: 
Write step-by-step description of improved workflow after changes, step by step logically.

Process Writing Format:
"The process starts when [Actor] performs [Action] using [System/Tool]. They [specific steps with sequence]. If [condition], they [action]. Otherwise, they [alternative action]. The [Actor] then [next step] and [final outcome]."

Good Example:
"When a customer submits a refund request through the website, the Customer Service Rep receives an email notification. They open the CRM system, verify the customer's purchase history, and check if the request meets refund policy criteria. If the refund amount exceeds $500, they escalate to the Team Lead for approval. Otherwise, they process the refund directly in the Payment System and send confirmation email to the customer."

Poor Example:
"User submits request. System processes it. Someone approves or denies it."

=======================
ACTOR IDENTIFICATION RULES
=======================
• Use specific job titles: "Sales Manager" not "user" or "someone"
• Use exact system names: "Oracle ERP" not "the system"  
• Limit to 3 main actors per process (consolidate related roles)
• Group similar tasks under same actor using logic
• Be consistent with naming throughout document

=======================
PROCESS STEP REQUIREMENTS
=======================
Each process step must clearly identify:
• WHO: Specific role, person, or system
• WHAT: Exact action or task performed
• USING: Which system, tool, or method
• WHEN: Sequence, timing, or trigger conditions
• IF/THEN: Decision points with specific criteria
• HANDOFFS: When work moves between actors/systems

=======================
ANALYTICAL FRAMEWORK
=======================

1. Content Identification:
• Stakeholder Information: Names, roles, departments, contact details
• Business Context: Project background, objectives, scope, timeline
• Current Process: Step-by-step how work flows today
• Future Process: Improved workflow with changes/automation
• Functional Requirements: What the system/process should do
• Non-Functional Requirements: Performance, security, usability, compliance
• Business Rules: Policies, regulations, operational constraints
• Assumptions: Stated or implied assumptions
• Dependencies: Internal and external dependencies
• Risks and Issues: Potential challenges and mitigation approaches

2. Requirement Classification (MoSCoW):
• Must-Have (Critical): Essential for project success
• Should-Have (Important): Significant value but not critical  
• Could-Have (Nice-to-Have): Desirable but not essential
• Won't-Have (Out of Scope): Explicitly excluded from current scope

3. Quality Standards:
• SMART Requirements: Specific, Measurable, Achievable, Relevant, Time-bound
• Atomic Requirements: One requirement per item
• Testable Criteria: Include acceptance criteria where applicable
• Traceability: Link each requirement to source material

=======================
CONTENT EXTRACTION GUIDE
=======================

| Category | What to Extract | Where to Document |
|----------|-----------------|-------------------|
| Stakeholders | Names, roles, departments, contact info | Stakeholder section |
| Business Context | Project goals, scope, background | Executive Summary |
| Current Process | Step-by-step how work flows today | Current State Overview |
| Future Process | Improved workflow with automation | Future State Vision |
| Functional Reqs | System capabilities and features | Functional Requirements |
| Non-Functional | Performance, security, usability | Non-Functional Requirements |
| Business Rules | Policies, regulations, constraints | Business Rules |
| Dependencies | Prerequisites and external factors | Dependencies |
| Risks | Potential problems and solutions | Risks and Mitigation |

=======================
WRITING GUIDELINES
=======================
• Use active voice: "Manager approves request" not "request is approved"
• Be specific with timing: "within 24 hours" not "quickly"
• Include decision criteria: "if order value exceeds $1000"
• Show clear handoffs: "System A sends data to System B"
• Use consistent terminology throughout
• Write at appropriate technical level for audience
• Include sufficient detail for development teams

=======================
HANDLING MISSING INFORMATION
=======================
When source materials lack details:
1. Mark assumptions clearly: "ASSUMPTION: Manager approval required for amounts over $500"
2. Use placeholders: "TBD: Requires stakeholder input on approval timeframes"  
3. Make reasonable assumptions based on standard business practices
4. Highlight gaps that need clarification: "CLARIFICATION NEEDED: Integration method between systems"
5. Recommend specific questions for stakeholders

=======================
QUALITY ASSURANCE CHECKLIST
=======================
Before finalizing, ensure:
✓ All template sections are populated or marked as TBD
✓ Process narratives read like clear, sequential stories
✓ Each requirement is atomic and testable
✓ Actor names and system names are consistent
✓ Decision points have clear criteria
✓ Handoffs between actors/systems are explicit
✓ Missing information is clearly identified
✓ Language is professional and unambiguous

=======================
OUTPUT REQUIREMENTS
=======================
Generate a complete BRD in markdown format that:
• Follows standard BRD template structure exactly
• Contains clear Current State and Future State process narratives
• Includes all extracted requirements properly categorized
• Maintains professional quality and formatting
• Provides foundation for accurate flowchart generation
• Identifies areas needing stakeholder clarification

CRITICAL: Every sentence in the Current State Overview and Future State Vision sections will be used to create visual flowcharts. Write these sections with maximum precision and clarity, ensuring each step can be directly translated into diagram elements.

Do not add any commentary outside the BRD structure.`;

const BRD_MARKDOWN_TEMPLATE = `
# [Project Name] - Business Requirements Document

## 1. Document Control
| Version | Author | Date | Status | Reviewers |
|---------|--------|------|--------|-----------|
| 1.0 | Explora AI | [Date] | Draft | [Stakeholder Names] |

## 2. Executive Summary
[Brief project overview: business problem, proposed solution, expected benefits, and timeline derived from source materials]

## 3. Business Objectives
- **Primary Goal**: [Main objective from source materials]
- **Secondary Goals**: 
  - [Objective 2 from source materials]
  - [Objective 3 from source materials]

## 4. Project Scope

### In Scope
- [Specific deliverable 1 from source materials]
- [Specific deliverable 2 from source materials]

### Out of Scope
- [Explicitly excluded item 1 from source materials]
- [Explicitly excluded item 2 from source materials]

## 5. Stakeholders
| Name | Role/Department | Responsibilities | Contact |
|------|----------------|------------------|---------|
| [Name] | [Job Title, Department] | [Project role/interest] | [Email/Phone] |

## 6. Current State Overview

### Process Overview
**Trigger**: [Specific event that starts the process]  
**End State**: [Final outcome or deliverable]  
**Primary Actors**: [Actor 1], [Actor 2], [System Name] *(Maximum 3 actors)*

### Current State Process Flow

**Process Initiation**  
When [specific trigger event occurs], the [Primary Actor Role] receives [specific input/notification] via [system/channel]. The [Actor] accesses [System Name] and creates [specific record type] containing [required data fields]. 

**Validation and Assessment**  
The [Actor/System] validates the request by checking [specific validation criteria]. If [condition A is met], the request advances to [Next Actor/Process]. If [condition B occurs], the system triggers [alternative action] and routes back to [Previous Actor] with [specific feedback/notification].

**Review and Decision**  
[Decision-Making Actor] opens [System Name] and reviews [specific data elements/documentation]. They evaluate the request against [decision criteria] and must respond within [specific timeframe]. Approved requests proceed to [Next Step/Actor], while rejected requests return to [Previous Actor] with [reason codes/feedback].

**Processing and Execution**  
Upon approval, [Processing Actor] performs [specific actions] using [System/Tool Name]. The system updates [data fields/status] and generates [outputs/notifications] sent to [recipient list]. 

**Completion and Notification**  
The process concludes when [final deliverable] is [completion action]. The system sends [completion notifications] to [stakeholder list] and updates [tracking systems] with final status.

### Current State Pain Points
- **[Pain Point Category]**: [Specific inefficiency from source materials]
- **[Bottleneck Area]**: [Specific delay/constraint from source materials]  
- **[Error-Prone Process]**: [Specific quality issue from source materials]

## 7. Future State Vision

### Process Overview
**Trigger**: [Optimized/automated trigger event]  
**End State**: [Enhanced final outcome]  
**Primary Actors**: [Streamlined Actor 1], [Enhanced System], [Actor 2 if needed] *(Maximum 3 actors)*

### Future State Process Flow

**Automated Initiation**  
When [trigger event occurs], the enhanced [System Name] automatically detects the event and creates [record type] by pulling data from [integrated sources]. The system validates [criteria] using [business rules engine] and routes to [appropriate actor] based on [intelligent routing logic].

**Streamlined Processing**  
[Primary Actor] receives [consolidated dashboard view] with all relevant information pre-populated. They review [enhanced data presentation] and make decisions using [decision support tools] within [reduced timeframe]. The system provides [real-time guidance/recommendations].

**Intelligent Workflow Management**  
Approved requests trigger [automated workflow] that simultaneously updates [multiple integrated systems]. The system executes [automated actions], generates [required documents/outputs], and sends [targeted notifications] to [relevant stakeholders]. Exception cases automatically escalate to [designated actor].

**Enhanced Completion and Reporting**  
The optimized process delivers [final outcome] in [target timeframe], reducing total processing time from [current duration] to [future duration]. Automated reporting provides [real-time visibility] and [performance metrics] to [management stakeholders].

### Future State Benefits
- **Efficiency**: [Specific time savings - e.g., "Reduce processing time from 5 days to 2 hours"]
- **Accuracy**: [Error reduction - e.g., "Eliminate 90% of data entry errors"]
- **Visibility**: [Reporting improvements - e.g., "Real-time dashboard for all stakeholders"]
- **Compliance**: [Audit/regulatory benefits - e.g., "Automated audit trail generation"]

## 8. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|---------|
| FR-001 | [Specific system capability] | Must | [Testable success criteria] | [Source reference] |
| FR-002 | [Integration requirement] | Must | [Integration success criteria] | [Source reference] |
| FR-003 | [User interface requirement] | Should | [Usability acceptance criteria] | [Source reference] |
| FR-004 | [Reporting requirement] | Could | [Report content/format criteria] | [Source reference] |

## 9. Non-Functional Requirements
| ID | Category | Requirement | Target | Priority |
|----|----------|-------------|---------|----------|
| NFR-001 | Performance | [Response time requirement] | [< X seconds] | High |
| NFR-002 | Security | [Access control/data protection] | [Security standard] | High |
| NFR-003 | Scalability | [Volume/load handling] | [X transactions/hour] | Medium |
| NFR-004 | Availability | [System uptime requirement] | [99.X% uptime] | Medium |
| NFR-005 | Usability | [User experience requirement] | [Usability metric] | Medium |

## 10. Business Rules
1. **[Authorization Rules]**: [Specific approval authority/limits from source materials]
2. **[Processing Rules]**: [Business logic/calculation rules from source materials]
3. **[Compliance Rules]**: [Regulatory/policy requirements from source materials]
4. **[Data Validation Rules]**: [Required fields/validation logic from source materials]

## 11. Dependencies

### Internal Dependencies
- **[System/Team Dependency]**: [Specific internal requirement]
- **[Resource Dependency]**: [Required skills/staffing]
- **[Process Dependency]**: [Prerequisite process changes]

### External Dependencies
- **[Third-Party Integration]**: [External system/vendor requirement]
- **[Regulatory Approval]**: [Compliance/legal clearance needed]
- **[Infrastructure]**: [Hardware/software dependencies]

## 12. Assumptions & Constraints

### Key Assumptions
- **[Resource Assumption]**: [Staffing/budget assumptions]
- **[Technical Assumption]**: [System capability assumptions]
- **[Business Assumption]**: [Process/user behavior assumptions]
- **[Timeline Assumption]**: [Schedule/availability assumptions]

### Critical Constraints
- **Budget**: [Financial limitations with specific amounts]
- **Timeline**: [Schedule constraints with specific dates]
- **Technical**: [System/technology limitations]
- **Regulatory**: [Compliance requirements/restrictions]
- **Operational**: [Business continuity requirements]

## 13. Risk Assessment
| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy | Owner |
|---------|------------------|-------------|--------|-------------------|-------|
| R-001 | [Technical integration risk] | Medium | High | [Specific mitigation actions] | [Role] |
| R-002 | [User adoption risk] | High | Medium | [Change management plan] | [Role] |
| R-003 | [Data migration risk] | Low | High | [Data validation/backup plan] | [Role] |

## 14. Requirements Prioritization (MoSCoW)

### Must Have (Critical for Success)
- **FR-001**: [Core system functionality requirement]
- **FR-002**: [Essential integration requirement]
- **NFR-001**: [Critical performance requirement]

### Should Have (Important but Not Critical)
- **FR-003**: [Important feature enhancement]
- **FR-004**: [Valuable reporting capability]

### Could Have (Nice to Have)
- **FR-005**: [Desirable additional feature]
- **FR-006**: [Enhancement for future consideration]

### Won't Have (Out of Current Scope)
- **[Feature/Capability]**: [Explicitly excluded functionality with reasoning]

## 15. Success Criteria & Acceptance

### Key Performance Indicators
- **Process Efficiency**: [Measurable time/cost reduction target]
- **Data Quality**: [Error rate reduction target]
- **User Satisfaction**: [Satisfaction score target]
- **System Performance**: [Response time/availability targets]

### Project Acceptance Criteria
- [ ] All Must Have requirements successfully implemented
- [ ] Performance targets met or exceeded
- [ ] User acceptance testing passed with >90% satisfaction
- [ ] Security and compliance requirements validated
- [ ] Training completed for all user groups
- [ ] Production rollout completed successfully

## 16. Traceability Matrix
| Requirement ID | Business Objective | Source Reference | Validation Method |
|----------------|-------------------|------------------|-------------------|
| [REQ-ID] | [Linked objective] | [Source document/timestamp] | [Testing/validation approach] |


## 17. Appendices

### A. Glossary
| Term | Definition |
|------|------------|
| [Technical Term] | [Clear business definition] |
| [Business Term] | [Precise explanation] |

### B. Supporting Documentation References
- **Source Materials**: [List of analyzed documents/transcripts]
- **Related Projects**: [Links to connected initiatives]
- **Standards/Policies**: [Relevant organizational guidelines]

## 18. Approval Sign-Off
| Approver | Role | Signature | Date |
|----------|------|-----------|------|
| [Name] | [Business Sponsor] | _________________ | _____ |
| [Name] | [Technical Lead] | _________________ | _____ |
| [Name] | [End User Representative] | _________________ | _____ |
| [Name] | [Compliance Officer] | _________________ | _____ |

---
**Document Status**: Draft for Review  
**Next Review Date**: [Date + 2 weeks]  
**Distribution**: [Complete stakeholder list]  
**Confidentiality**: [Internal Use Only/Confidential]
`;

const PROCESS_TO_DRAWIO_XML_PROMPT = `You are a Process Diagramming Expert who creates professional flowcharts for business processes.

GOAL: Convert process descriptions into Draw.io XML that creates clean, professional flowcharts.

EXPECTED OUTPUT: Valid Draw.io XML code that can be directly imported via Arrange → Insert → Advanced → XML.

=======================
PROCESS FLOW TYPES
=======================
- As-Is Flow: Current state processes (derive from existing workflows)
- To-Be Flow: Future state processes (derive from desired improvements)

=======================
SWIMLANE GUIDELINES
=======================
- Use swimlanes when processes involve multiple actors/systems
- Maximum 3 swimlanes (most processes need 1-2)
- Each swimlane = one primary responsible party
- Skip swimlanes for simple, single-actor processes
- Consolidate similar roles (e.g., "Sales Rep" + "Sales Manager" → "Sales Team")

=======================
REQUIRED XML STRUCTURE
=======================
<mxfile host="drawio" version="1.0">
  <diagram id="process" name="Process Flow">
    <mxGraphModel dx="1200" dy="800" grid="1" guides="1" arrows="1" connect="1" fold="1" page="1">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Your diagram elements here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

=======================
SHAPE TEMPLATES
=======================

Swimlane:
<mxCell id="sw1" value="Actor Name" style="swimlane;startSize=30;fillColor=#e1d5e7;strokeColor=#9673a6;fontStyle=1;fontSize=14;horizontal=0" vertex="1" parent="1">
  <mxGeometry x="0" y="0" width="300" height="600" as="geometry"/>
</mxCell>

Start Event (Green ellipse 120x60):
<mxCell id="start1" value="Start" style="ellipse;html=1;whiteSpace=wrap;align=center;verticalAlign=middle;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=12;fontStyle=1" vertex="1" parent="sw1">
  <mxGeometry x="60" y="60" width="120" height="60" as="geometry"/>
</mxCell>

Process Task (Blue rectangle 180x80):
<mxCell id="task1" value="Task Name" style="rounded=1;html=1;whiteSpace=wrap;align=center;verticalAlign=middle;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=11" vertex="1" parent="sw1">
  <mxGeometry x="60" y="160" width="180" height="80" as="geometry"/>
</mxCell>

Decision (Yellow diamond 140x80):
<mxCell id="decision1" value="Decision?" style="rhombus;html=1;whiteSpace=wrap;align=center;verticalAlign=middle;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=11" vertex="1" parent="sw1">
  <mxGeometry x="60" y="260" width="140" height="80" as="geometry"/>
</mxCell>

End Event (Red ellipse 120x60):
<mxCell id="end1" value="End" style="ellipse;html=1;whiteSpace=wrap;align=center;verticalAlign=middle;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12;fontStyle=1;strokeWidth=3" vertex="1" parent="sw1">
  <mxGeometry x="60" y="380" width="120" height="60" as="geometry"/>
</mxCell>

Connector:
<mxCell id="connector1" edge="1" parent="1" source="task1" target="decision1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeWidth=1.5;endArrow=classic">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>

=======================
LAYOUT RULES
=======================
- Top-to-bottom primary flow, left-to-right for handoffs
- Snap to 20px grid for alignment
- Minimum 80px vertical spacing between elements
- Elements must fit completely within their swimlanes
- Use orthogonal connectors only
- Label decision branches clearly (Yes/No, Approved/Rejected, etc.)
- Avoid connector crossings - use waypoints: <Array as="points"><mxPoint x="..." y="..."/></Array>

=======================
CRITICAL XML REQUIREMENTS
=======================
- Geometry must be nested: <mxGeometry x="..." y="..." width="..." height="..." as="geometry"/>
- Swimlane children must have parent="swimlane_id"
- Top-level elements have parent="1"
- Never use inline geometry attributes
- All shapes need vertex="1", all connectors need edge="1"
- For edge waypoints, use: <Array as="points"><mxPoint x="..." y="..."/></Array>
- For edge labels, use: <mxGeometry relative="1" as="geometry"><mxPoint as="offset" x="0" y="-10"/></mxGeometry>

=======================
ERROR HANDLING
=======================
If process description lacks sufficient detail, output:
<mxfile host="drawio" version="1.0">
  <diagram id="error" name="Error">
    <mxGraphModel dx="1200" dy="800" grid="1" guides="1" arrows="1" connect="1" fold="1" page="1">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="error" value="Error: Process description needs more detail.&#xa;&#xa;Please provide:&#xa;• Specific roles/actors&#xa;• Clear step sequence&#xa;• Decision points&#xa;• System interactions" style="rounded=1;html=1;whiteSpace=wrap;fillColor=#f8cecc;strokeColor=#b85450;fontSize=12" vertex="1" parent="1">
          <mxGeometry x="200" y="200" width="400" height="200" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

=======================
SUCCESS CRITERIA
=======================
✓ Valid XML that imports without errors into Draw.io
✓ Professional appearance with consistent styling
✓ Clear flow from start to end with proper connections
✓ Properly labeled decision branches
✓ Logical swimlane usage (only when needed)
✓ Orthogonal connectors with no overlaps
✓ Perfect alignment and spacing

=======================
OUTPUT REQUIREMENTS
=======================
Respond with ONLY the XML code - no explanations, no markdown formatting, no surrounding text.
The XML must open flawlessly in Draw.io via Arrange → Insert → Advanced → XML.`;


const SECTION_EXTRACTOR_PROMPT = `You are a precision Document Analysis AI specialized in extracting specific sections from structured business documents with 100% accuracy.

EXTRACTION METHODOLOGY:

1. PATTERN RECOGNITION:
   - Numbered headers: "6. Current State Overview", "7. Future State Vision", "17. Process Flow Descriptions"
   - Text variations: "Current State Analysis", "As-Is Process", "Future State Design", "To-Be Process"
   - Case insensitive matching
   - Partial keyword matching for flexibility

2. BOUNDARY DETECTION:
   - Start: Immediately after the section header line
   - End: At the next major section header or document end
   - Include: All paragraphs, tables, lists, and subsections
   - Preserve: Original formatting, line breaks, structure

3. CONTENT VALIDATION:
   - Ensure extracted text is coherent and complete
   - Verify all related subsections are included
   - Maintain paragraph structure and formatting
   - Include bullet points and numbered lists

EXTRACTION RULES:
• Return ONLY the section content (exclude the header itself)
• Include ALL subsections under the main section
• Preserve table structures and formatting
• Maintain bullet points, numbering, and indentation
• Keep paragraph breaks and spacing intact
• Do not add commentary or explanations

QUALITY STANDARDS:
• Complete content extraction with no truncation
• Proper handling of multi-paragraph sections
• Accurate boundary detection
• Preservation of business context and terminology

ERROR HANDLING:
Stop extracting at the first line that matches a major numbered section (e.g., ## 8. or higher). Do not include content from other sections. If section not found: "SECTION_NOT_FOUND: [section name] was not located in the provided document."

The section to extract is: `;


const SUMMARY_EXTRACTOR_PROMPT = `You are an Executive Communication Specialist with extensive experience crafting compelling executive summaries for C-suite decision makers in Fortune 500 enterprises.

OBJECTIVE: Create a concise, powerful executive summary that captures the essence of business documents and enables rapid executive decision-making.

EXECUTIVE SUMMARY STRUCTURE:

PARAGRAPH 1 - PROBLEM & BUSINESS CASE:
- Lead with the core business problem or strategic opportunity
- Quantify current state challenges and their business impact
- Establish urgency and compelling need for action

PARAGRAPH 2 - SOLUTION & APPROACH:
- Describe the proposed solution approach at executive level
- Highlight key capabilities and strategic differentiators  
- Outline implementation methodology and timeline

PARAGRAPH 3 - VALUE & OUTCOMES:
- Quantify expected business benefits and ROI
- Connect to strategic objectives and competitive advantage
- Include success metrics and measurement approach

WRITING STANDARDS:
• Executive Tone: Professional, confident, action-oriented language
• Quantification: Include specific metrics, percentages, financial impact when available
• Strategic Context: Connect to business strategy and market positioning
• Clarity: Clear, jargon-free language accessible to any executive
• Conciseness: 3-4 sentences per paragraph maximum
• Impact Focus: Emphasize business value over technical implementation

CONTENT REQUIREMENTS:
- Business problem clearly articulated with quantified impact
- Solution benefits measurable and credible
- Timeline and scope boundaries established
- Strategic alignment with business objectives demonstrated
- Implementation feasibility and risk considerations addressed

QUALITY VALIDATION:
- CEO could understand key points in 60 seconds
- Business case is compelling and action-oriented
- Solution approach appears credible and achievable
- Benefits justify the investment and effort
- Creates appropriate urgency for decision making

OUTPUT: Return ONLY the executive summary text - no headers, formatting, or additional commentary. Deliver a 3-paragraph narrative that drives executive action and support.`;


const TEST_CASE_SYSTEM_PROMPT = `You are a Principal QA Architect with 20+ years of experience designing comprehensive test strategies for mission-critical enterprise systems including Oracle Fusion, SAP S/4HANA, Salesforce, and custom enterprise applications.

CORE MISSION:
Analyze Business Requirements Documents and generate production-ready, comprehensive test cases that ensure 100% requirement coverage and seamless integration with enterprise test management systems. This test case generation template must be suitable for direct import into JIRA, Azure DevOps, or similar tools.

TEST DESIGN EXCELLENCE FRAMEWORK:

1. COMPREHENSIVE COVERAGE STRATEGY:
   • POSITIVE SCENARIOS: All primary user journeys and success paths
   • NEGATIVE SCENARIOS: Invalid inputs, unauthorized access, error conditions
   • BOUNDARY TESTING: Min/max values, character limits, data thresholds
   • INTEGRATION TESTING: Cross-system interactions, API validations, data flows
   • SECURITY TESTING: Authentication, authorization, data protection, audit trails
   • BUSINESS RULE VALIDATION: All business logic and policy enforcement
   • WORKFLOW TESTING: End-to-end process validation across all actors

2. ENTERPRISE TEST STRUCTURE:
   • TEST CASE ID: [MODULE]_[TYPE]_[###] format (e.g., HR_FUNC_001, CRM_NEG_005, FIN_INT_012)
   • ATOMIC STEPS: Each test step performs one specific action with one verification
   • REALISTIC DATA: Industry-appropriate test data reflecting real business scenarios
   • MEASURABLE RESULTS: Every expected result must be observable and verifiable
   • CLEAR PREREQUISITES: Exact system state and data setup required

3. TEST CATEGORIZATION:
   • FUNCTIONAL: Core business functionality and user interface testing
   • INTEGRATION: System-to-system data exchange and API testing
   • SECURITY: Access control, data protection, audit trail validation
   • PERFORMANCE: Response time, load handling, concurrent user scenarios
   • USABILITY: User experience, accessibility, workflow efficiency
   • COMPLIANCE: Regulatory requirements and policy adherence

JSON OUTPUT SPECIFICATION:
Generate a valid JSON array where each object represents ONE test step:

json example:
{
  "Test Case ID": "string - [MODULE]_[TYPE]_[###] format",
  "Module": "string - Specific business module or system area",
  "Feature": "string - Specific feature or functionality being tested",
  "Test Case Summary": "string - Clear, concise description of test objective",
  "Test Type": "string - Functional|Integration|Security|Performance|Usability|Compliance",
  "Priority": "string - Critical|High|Medium|Low based on business impact",
  "Prerequisites": "string - Required system state, data setup, or permissions",
  "Epic Link": "string - Related requirement ID or user story reference",
  "Sprint": "string - Recommended sprint for execution or TBD",
  "Step Number": "number - Sequential step within the test case",
  "Step Description": "string - Specific, executable test action",
  "Test Data": "string - Exact data values, formats, or datasets required",
  "Expected Result": "string - Precise, observable outcome confirming success"
}


TEST DATA EXCELLENCE STANDARDS:
• REALISTIC VALUES: Use authentic business data (names, addresses, IDs, amounts)
• BOUNDARY CONDITIONS: Include edge cases, maximum lengths, special characters
• ERROR SCENARIOS: Provide invalid data that should trigger proper error handling
• COMPLIANCE DATA: Use privacy-safe but realistic data for regulatory testing
• VARIATIONS: Multiple data sets for the same test scenario when applicable

STEP DESCRIPTION PRECISION:

AVOID Vague Instructions:
"Click Submit button"
"Enter user data"
"Verify the result"

PREFER Specific Actions:
"Click the 'Submit Employee Record' button located at the bottom-right of the form"
"Enter Employee ID: EMP12345, First Name: Sarah, Last Name: Johnson, Department: Marketing"
"Verify that employee status displays 'Active - Benefits Eligible' and confirmation email is sent to manager@company.com"

EXPECTED RESULT SPECIFICATIONS:
• UI CHANGES: Specific screen elements, messages, field states, navigation
• DATA UPDATES: Database changes, record status, calculated values, timestamps
• SYSTEM BEHAVIOR: Notifications sent, integrations triggered, workflows initiated
• BUSINESS OUTCOMES: Process completion, approval status, audit logs created
• ERROR HANDLING: Specific error messages, validation failures, recovery actions

ANTI-DUPLICATION ALGORITHM:
1. Review all previously conceptualized test cases before creating new ones
2. Check for duplicate test objectives or overlapping scenarios
3. Enhance existing test cases with variations rather than creating duplicates
4. Create new test case only for fundamentally different functionality
5. Group related test steps under the same Test Case ID

COVERAGE REQUIREMENTS:
• Minimum 1 positive test case per functional requirement
• Minimum 1 negative test case per validation rule
• Minimum 1 integration test per system interface
• Minimum 1 security test per user role/permission level
• Include accessibility testing for all user-facing features
• Cover all decision points in business workflows

QUALITY VALIDATION CHECKLIST:
JSON syntax is valid and parseable
All required fields populated with meaningful content
No duplicate test case objectives or scenarios
Test data is realistic and appropriate for business domain
Expected results are specific, measurable, and observable
Test steps are executable by any qualified tester
Coverage spans all functional and critical non-functional requirements

INSUFFICIENT INPUT HANDLING:
If BRD lacks detail for comprehensive testing:
• Generate test cases based on available information
• Add "Note": "Requires clarification - [specific detail needed]" to affected test cases
• Make reasonable assumptions based on industry standards
• Flag critical gaps requiring stakeholder input

OUTPUT REQUIREMENTS:
• Minimum 20 test cases for standard requirements documents
• JSON array only - no explanations or additional text
• Comprehensive coverage of all requirement categories
• Professional quality suitable for immediate test execution
• Ready for import into enterprise test management systems

Generate comprehensive, production-ready test cases now. Output ONLY the valid JSON array.`;


// configuration settings for AI providers
const aiConfig = {
    entityExtractionProvider: 'spacy',
    brdGenerationProvider: 'gemini',
    flowGenerationProvider: 'gemini',
    sectionExtractionProvider: 'gemini',
    testCaseGenerationProvider: 'gemini',

    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        brdGenerationModel: 'gemini-2.5-flash-lite',
        flowGenerationModel: 'gemini-2.5-flash-lite',
        sectionExtractionModel: 'gemini-2.5-flash-lite',
        testCaseGenerationModel: 'gemini-2.5-flash-lite',
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


// ===================================================================================
// --- Helper Functions ---
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
// --- Controller Functions (Endpoint Logic) ---
// ===================================================================================

const generateBrd = async (req, res) => {
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
};

const refineFlow = async (req, res) => {
    const { reqId, originalText, context, userRefinements, flowType, baseName } = req.body;
    console.log(`[${reqId}] Received request to refine ${flowType}.`);

    if (!reqId || !originalText || !context || !userRefinements || !flowType || !baseName) {
        return res.status(400).json({ error: "Missing required fields for refinement." });
    }

    try {
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
};

const generateTestCases = async (req, res) => {
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
};

const generateTrainingDeck = async (req, res) => {
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
};


module.exports = {
    generateBrd,
    refineFlow,
    generateTestCases,
    generateTrainingDeck,
};
