# ner_spacy.py
# This script uses the spaCy library to perform Named Entity Recognition (NER).
# **UPGRADED** with intelligent, rule-based filtering to extract only relevant
# people and organization names, while ignoring noise and geographical locations.

import sys
import spacy
import json

def extract_entities(text):
    """
    Extracts relevant Person and Organization entities from text using spaCy,
    applying filters to remove common noise and unwanted categories.

    Args:
        text (str): The input text to process.

    Returns:
        dict: A dictionary containing lists of people and organizations.
    """
    # ==============================================================================
    # --- ENTITY DENY LIST ---
    # This list contains common noise words to be excluded from the results.
    # Add any other non-relevant terms that spaCy might misclassify.
    # The check is case-insensitive.
    # ==============================================================================
    deny_list = {
        "api", "apis", "bpa", "capex", "cio", "coo", "etl", "je", "jee",
        "labor", "ocr", "pdf", "po", "sow", "sox", "tnm", "uat", "vpa"
    }

    try:
        # Load the pre-trained English spaCy model.
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        # If the model isn't downloaded, provide a helpful error message.
        print(json.dumps({
            "error": "spaCy model 'en_core_web_sm' not found. Please run 'python3 -m spacy download en_core_web_sm'."
        }), file=sys.stderr)
        sys.exit(1)

    # Process the text with spaCy.
    doc = nlp(text)

    # Initialize lists for the different entity types.
    # We are only interested in people and organizations.
    entities = {
        "people": [],
        "organizations": []
    }

    # Iterate over the found entities in the document.
    for ent in doc.ents:
        entity_text = ent.text.strip()
        lower_entity_text = entity_text.lower()

        # --- INTELLIGENT FILTERING LOGIC ---

        # Rule 1: Only include PERSON and ORG entity types.
        # This automatically excludes locations, dates, numbers, etc.
        if ent.label_ not in ["PERSON", "ORG"]:
            continue

        # Rule 2: Exclude any entity found in our deny_list.
        if lower_entity_text in deny_list:
            continue

        # Rule 3: Exclude short, all-caps acronyms (often misclassified as ORG).
        if len(entity_text) <= 3 and entity_text.isupper():
            continue
            
        # Rule 4: Exclude entities that are likely just noise.
        if len(entity_text) <= 1 or entity_text.isdigit():
            continue

        # If the entity passes all filters, add it to the correct list.
        if ent.label_ == "PERSON":
            entities["people"].append(entity_text)
        elif ent.label_ == "ORG":
            entities["organizations"].append(entity_text)

    # To ensure uniqueness, convert lists to sets and back to lists.
    entities["people"] = list(set(entities["people"]))
    entities["organizations"] = list(set(entities["organizations"]))
    
    return entities

if __name__ == "__main__":
    # Read the entire standard input as a single string.
    input_text = sys.stdin.read()
    
    # Extract entities from the input text.
    found_entities = extract_entities(input_text)
    
    # Print the resulting JSON to standard output.
    # This will be captured by the Node.js parent process.
    print(json.dumps(found_entities))