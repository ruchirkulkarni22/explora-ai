# Explora AI: Your Intelligent Partner for the Full ERP Implementation Lifecycle

**Explora AI** is a revolutionary, privacy-first platform designed to accelerate and de-risk complex ERP implementation projects. By leveraging cutting-edge AI, Explora transforms unstructured project inputs into the structured, actionable, and high-quality documentation needed to keep your project on track, on time, and on budget.

Through an intuitive conversational interface, business analysts, project managers, QA teams, and training coordinators can eliminate hundreds of hours of manual work, reduce human error, and ensure alignment across all phases of the implementation cycle.

---

## Usage

Start client:

```bash
VITE_API_URL=http://192.168.5.242:3001 npm run dev -- --host=0.0.0.0
```

Start server:

```bash
source venv/bin/activate
node server.js
```

---

## Key Features

Explora AI offers a suite of powerful, interconnected tools accessible through a single, intelligent chat interface.

### 1. BRD & Process Flow Generation

Transform raw, unstructured data from meeting transcripts, workshop notes, and stakeholder emails into a comprehensive, professional **Business Requirements Document (BRD)**.

- **Intelligent Extraction** – Analyzes all provided documents to identify and structure key information, including:
  - Business objectives
  - Scope
  - Stakeholders
  - Functional & non-functional requirements
  - Risks, and more.
  
- **As-Is & To-Be Process Flows** – Automatically generates editable [draw.io](https://draw.io) diagrams for both current state and future state processes directly from requirements text.

- **Interactive Refinement** – If a process description is ambiguous, the AI proactively asks for clarification to ensure diagrams are accurate and detailed.

- **Privacy-First Anonymization** – Automatically anonymizes all source documents, replacing sensitive names and organizations with untraceable codes to protect confidentiality.

---

### 2. Automated Test Case Generation

Bridge the gap between requirements and quality assurance by instantly generating a **complete test case suite** from a BRD or similar requirement document.

- **Comprehensive Coverage** – Creates positive, negative, and edge-case test scenarios for each functional requirement.
- **Structured Output** – Generates a ready-to-use Excel file with:
  - Detailed test steps
  - Test data
  - Expected results
  - Pre-built formulas for a live progress-tracking dashboard.
- **Professional Formatting** – Includes clear IDs, summaries, priorities, and prerequisites, ready for import into tools like Jira or Zephyr.
- **Reduces Ambiguity** – Ensures every requirement is testable, promoting clarity early in the lifecycle.

---

### 3. Smart Training Deck Finder

Accelerate user adoption by intelligently matching project documentation to your existing training repository.

- **Context-Aware Matching** – Upload a test case document, and the AI finds the most relevant PowerPoint decks from your repository.
- **Reduces Redundant Work** – Prevents recreation of training materials that already exist.
- **Packaged for Convenience** – Automatically compiles matched decks and a detailed matching report into a `.zip` file.
- **Onboards Teams Faster** – Enables project teams and end-users to quickly find the exact materials they need.

---

## Privacy & Security

We understand your project documents contain sensitive information.  
**Explora AI** is built with **privacy-first architecture**:

- All uploaded content is anonymized before processing.
- Confidential stakeholder and company information is replaced with untraceable codes.
- A **redaction key** is saved locally, enabling you to de-anonymize the final output when needed.

---

## Explora AI in the ERP Implementation Lifecycle

Explora AI isn’t just a set of tools—it’s a **partner** that adds value at every critical stage.

| **Phase**               | **How Explora AI Accelerates the Process** |
|--------------------------|--------------------------------------------|
| **1. Discovery & Planning** | Convert stakeholder inputs into a formal BRD in days, not weeks. |
| **2. Design & Configuration** | Provides an unambiguous blueprint for consultants, reducing errors and scope creep. |
| **3. Development & Customization** | BRD supports custom RICEFW development; test cases are ready early. |
| **4. Testing (SIT, UAT)** | Automates full test case creation, saving hundreds of QA hours. |
| **5. Training & Change Management** | Smart deck finder equips trainers with the most relevant, updated materials. |
| **6. Go-Live & Support** | Generated documentation becomes a knowledge asset for quick troubleshooting. |

---

## How It Works

1. **Upload** – Drag and drop project files (transcripts, notes, BRDs) into the chat.
2. **Choose** – Choose any of the available features
   - `"Generate a BRD and As-Is flow from input transcripts"`
   - `"Create test cases based on this BRD"`
   - `"Find relevant training decks from your knowledge repository"`
3. **Interact** – AI may ask for clarification or proceed with processing.
4. **Download** – Receive professionally formatted documents, spreadsheets, and diagrams.

---
