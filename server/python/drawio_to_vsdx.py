# server/python/drawio_to_vsdx.py
# This script converts a draw.io XML file into a Microsoft Visio (.vsdx) file.
# It parses the draw.io diagram structure and translates it into the Open Packaging
# Conventions format used by Visio, including shapes, connectors, and page data.

import sys
import xml.etree.ElementTree as ET
import zipfile
import io
import base64
import uuid

# --- VSDX File Templates ---
# These are the boilerplate XML files required for a valid .vsdx package,
# structured to match a standard Visio file.

CONTENT_TYPES_XML = """<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/vnd.ms-visio.xml"/>
    <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>
    <Override PartName="/visio/masters/masters.xml" ContentType="application/vnd.ms-visio.masters+xml"/>
    <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
</Types>
"""

RELS_XML = """<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
</Relationships>
"""

DOCUMENT_RELS_XML = """<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId2" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="pages/page1.xml"/>
    <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/masters" Target="masters/masters.xml"/>
</Relationships>
"""

DOCUMENT_XML = """<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<VisioDocument xmlns="http://schemas.microsoft.com/visio/2010/drawing">
    <Pages>
        <Page ID="0" NameU="Page-1" ViewScale="1" IsBackground="0">
            <PageSheet><Cell N="PageWidth" V="11" U="IN"/><Cell N="PageHeight" V="8.5" U="IN"/></PageSheet>
        </Page>
    </Pages>
</VisioDocument>
"""

MASTERS_XML = """<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<Masters xmlns="http://schemas.microsoft.com/visio/2010/drawing">
    <Master ID="1" UniqueID="{00000000-0000-0000-0000-000000000000}" NameU="Rectangle"/>
    <Master ID="2" UniqueID="{00000000-0000-0000-0000-000000000001}" NameU="Ellipse"/>
    <Master ID="3" UniqueID="{00000000-0000-0000-0000-000000000002}" NameU="Rhombus"/>
    <Master ID="4" UniqueID="{00000000-0000-0000-0000-000000000003}" NameU="Dynamic connector"/>
</Masters>
"""

def get_master_id_from_style(style):
    """Maps draw.io shape styles to Visio Master IDs."""
    if not style: return "1"
    if "ellipse" in style: return "2"
    if "rhombus" in style: return "3"
    return "1"

def convert_drawio_to_vsdx(xml_string):
    """Main conversion function."""
    shapes_xml = []
    connects_xml = []
    shape_map = {}

    try:
        root = ET.fromstring(xml_string)
        mx_cells = root.findall(".//mxCell")

        visio_id_counter = 1
        page_width_px = float(root.find(".//mxGraphModel").get("pageWidth", "1920"))
        page_height_px = float(root.find(".//mxGraphModel").get("pageHeight", "1080"))
        page_width_in = 11.0
        page_height_in = 8.5

        # Create shapes
        for cell in mx_cells:
            if cell.get("vertex") == "1":
                cell_id = cell.get("id")
                visio_id = visio_id_counter
                shape_map[cell_id] = visio_id
                visio_id_counter += 1

                geo = cell.find("mxGeometry")
                if geo is None: continue

                master_id = get_master_id_from_style(cell.get("style", ""))
                width_px = float(geo.get("width", "120"))
                height_px = float(geo.get("height", "60"))
                x_px = float(geo.get("x", "0"))
                y_px = float(geo.get("y", "0"))

                width_in = (width_px / page_width_px) * page_width_in
                height_in = (height_px / page_height_px) * page_height_in
                pin_x_in = ((x_px + width_px / 2) / page_width_px) * page_width_in
                pin_y_in = page_height_in - (((y_px + height_px / 2) / page_height_px) * page_height_in)

                text = cell.get("value", "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

                shapes_xml.append(f'<Shape ID="{visio_id}" Type="Shape" Master="{master_id}"><Cell N="PinX" V="{pin_x_in}"/><Cell N="PinY" V="{pin_y_in}"/><Cell N="Width" V="{width_in}"/><Cell N="Height" V="{height_in}"/><Text>{text}</Text></Shape>')

        # Create connectors
        for cell in mx_cells:
            if cell.get("edge") == "1":
                source_id = cell.get("source")
                target_id = cell.get("target")

                if source_id in shape_map and target_id in shape_map:
                    visio_id = visio_id_counter
                    visio_id_counter += 1
                    source_visio_id = shape_map[source_id]
                    target_visio_id = shape_map[target_id]

                    shapes_xml.append(f'<Shape ID="{visio_id}" Type="Shape" Master="4"><Cell N="BeginX" V="0"/><Cell N="BeginY" V="0"/><Cell N="EndX" V="0"/><Cell N="EndY" V="0"/></Shape>')
                    connects_xml.append(f'<Connect FromSheet="{visio_id}" FromCell="BeginX" ToSheet="{source_visio_id}" ToCell="PinX"/>')
                    connects_xml.append(f'<Connect FromSheet="{visio_id}" FromCell="EndX" ToSheet="{target_visio_id}" ToCell="PinX"/>')

    except ET.ParseError as e:
        print(f"Error parsing XML: {e}", file=sys.stderr)
        return None

    page1_xml = f"""<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
    <PageContents xmlns="http://schemas.microsoft.com/visio/2010/drawing">
        <Shapes>{''.join(shapes_xml)}</Shapes>
        <Connects>{''.join(connects_xml)}</Connects>
    </PageContents>"""

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES_XML)
        zf.writestr("_rels/.rels", RELS_XML)
        zf.writestr("visio/document.xml", DOCUMENT_XML)
        zf.writestr("visio/_rels/document.xml.rels", DOCUMENT_RELS_XML)
        zf.writestr("visio/masters/masters.xml", MASTERS_XML)
        zf.writestr("visio/pages/page1.xml", page1_xml)

    return zip_buffer.getvalue()

if __name__ == "__main__":
    input_xml = sys.stdin.read()
    vsdx_content = convert_drawio_to_vsdx(input_xml)
    if vsdx_content:
        encoded_content = base64.b64encode(vsdx_content).decode('utf-8')
        print(encoded_content)
