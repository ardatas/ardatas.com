from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image

ROOT=Path(__file__).resolve().parent
AS=ROOT/'assets'
OUT=ROOT.parent/'Arda_Tas_Project_Portfolio.pdf'
FONT=Path('/System/Library/Fonts/Supplemental')
for name,file in [('Sans','Arial.ttf'),('Bold','Arial Bold.ttf'),('Italic','Arial Italic.ttf'),('Serif','Georgia.ttf'),('Mono','Courier New.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(FONT/file)))
pdfmetrics.registerFontFamily('Sans',normal='Sans',bold='Bold',italic='Italic',boldItalic='Bold')
W,H=595.2756,841.8898
M=43; CW=W-2*M
INK=HexColor('#182837'); MUT=HexColor('#596775'); BLUE=HexColor('#224DD0'); LINE=HexColor('#D7DFE5'); PALE=HexColor('#F1F5F7'); TEAL=HexColor('#187D77')
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('Arda Tas | Selected projects')
c.setAuthor('Arda Tas')
c.setSubject('Software engineering, AI workflows, scientific computing and product design')
page=0
content=[]

def tx(t,x,y,size=10,font='Sans',color=INK):
    assert '\u2014' not in t and '\u2013' not in t
    content.append(t)
    c.setFillColor(color);c.setFont(font,size);c.drawString(x,H-y-size*.83,t)

def para(t,x,y,w=CW,size=10.4,leading=14.7,color=INK,font='Sans'):
    assert '\u2014' not in t and '\u2013' not in t
    content.append(t)
    p=Paragraph(t,ParagraphStyle('p',fontName=font,fontSize=size,leading=leading,textColor=color,spaceAfter=0))
    _,h=p.wrap(w,H); p.drawOn(c,x,H-y-h)
    assert y+h<794, (page,t,y+h)
    return y+h

def rect(x,y,w,h,color=PALE,stroke=None):
    c.setFillColor(color);c.setStrokeColor(stroke or color);c.rect(x,H-y-h,w,h,fill=1,stroke=bool(stroke))

def line(x1,y1,x2,y2,color=LINE,width=.7):
    c.setStrokeColor(color);c.setLineWidth(width);c.line(x1,H-y1,x2,H-y2)

def arrow(x1,y1,x2,y2,color=BLUE):
    line(x1,y1,x2,y2,color,1.4)
    p=c.beginPath();p.moveTo(x2,H-y2);p.lineTo(x2-5,H-y2+3);p.lineTo(x2-5,H-y2-3);p.close();c.setFillColor(color);c.drawPath(p,fill=1,stroke=0)

def img(path,x,y,w,h=None,crop=None):
    im=Image.open(path)
    if crop: im=im.crop(crop)
    if h is None:h=w*im.height/im.width
    c.drawImage(ImageReader(im),x,H-y-h,w,h,mask='auto')
    return y+h

def link(label,url,x,y,size=9.5):
    tx(label,x,y,size,'Bold',BLUE)
    width=pdfmetrics.stringWidth(label,'Bold',size)
    c.linkURL(url,(x,H-y-size-3,x+width,H-y+2),relative=0,thickness=0)
    return width

def section(t,x,y):tx(t.upper(),x,y,8.1,'Bold',TEAL)

def start(kicker,title,subtitle):
    global page
    page+=1;c.bookmarkPage('p'+str(page));c.addOutlineEntry(title,'p'+str(page),0,False)
    rect(0,0,W,7,BLUE)
    tx('ARDA TAS',M,27,9,'Bold');tx('SELECTED PROJECTS / OCTOBER 2026',W-267,27,8,'Sans',MUT)
    line(M,49,W-M,49)
    tx(kicker.upper(),M,69,8.3,'Bold',TEAL)
    tx(title,M,90,28,'Serif')
    para(subtitle,M,134,CW,11.2,15.8,MUT)

def foot():
    line(M,798,W-M,798)
    link('ardatas.com','https://ardatas.com',M,812,8)
    tx('Arda Tas | Project portfolio',225,812,8,'Sans',MUT)
    tx(f'{page:02d} / 07',W-M-34,812,8,'Sans',MUT)
    c.showPage()

def focus(t,y=731):
    rect(M,y,CW,48,PALE)
    tx('LOOK CLOSER',M+12,y+10,7.5,'Bold',TEAL)
    para(t,M+94,y+10,CW-106,9.5,12.6)

def block(title,text,x,y,w):
    section(title,x,y);return para(text,x,y+20,w)

# 1: overview
start('Engineering portfolio','Arda Tas','Computer Science at the Technical University of Munich | Munich, Germany')
tx('Selected work in software engineering',M,179,19,'Bold')
para('I build applications that connect clear interfaces with reliable execution. My work spans AI-assisted products, industrial data processing, and performance-focused C programming.',M,214,CW,12,17)
img(AS/'larp-live.png',M,289,321,181)
rect(M+333,289,CW-333,181,PALE)
img(AS/'julia-full.png',M+333,313,CW-333,133,crop=(165,110,855,630))
para('Product interface: larpyourresume. Fractal output: Julia Set Explorer.',M,479,CW,8.2,11,MUT)
section('A guide to the work',M,519)
rows=[('02-03','larpyourresume','Full-stack product, PDF generation, visual design',2),('04','Werkio','Reviewed AI workflows and browser automation',4),('05','CHECK24 MCP App','API contracts, tool routing, conformance feedback',5),('06','Industrial data pipeline','Scientific Python, GUI workflows, data integrity',6),('07','Julia Set Explorer','SIMD profiling, correctness, measured performance',7)]
for i,(num,title,desc,p) in enumerate(rows):
    y=549+i*39
    tx(num,M,y,10,'Bold',BLUE);tx(title,M+49,y,11,'Bold');tx(desc,M+49,y+16,9,'Sans',MUT)
    c.linkRect('',f'p{p}',(M,H-y-31,W-M,H-y+3),relative=0,thickness=0)
link('Portfolio','https://ardatas.com',M,757)
link('GitHub','https://github.com/ardatas',M+91,757)
link('LinkedIn','https://linkedin.com/in/arda-tas',M+171,757)
link('arda@ardatas.com','mailto:arda@ardatas.com',M+264,757)
foot()

# 2: larp engineering
start('01 / Product engineering','larpyourresume','A resume workspace with structured editing, LaTeX controls, and compiled A4 PDF output.')
img(AS/'editor-desktop.png',M,184,CW,352)
para('Application screenshot with test content: the LaTeX editor and compiled PDF preview.',M,545,CW,8.3,11.5,MUT)
x2=313;col=239
block('What I built','I built the resume dashboard, autosaving editor, and PDF workflow. Users can organize multiple versions, edit section forms or LaTeX, and control page margins, typography, and spacing.',M,576,col)
block('Engineering decisions','A separate container compiles LuaLaTeX with shell access disabled and bounded requests. The UI distinguishes saved edits from the last compiled preview. Save recovery preserves conflicting edits as a separate resume.',x2,576,col)
para('<b>Stack:</b> Next.js, React, TypeScript, Zod, Supabase/PostgreSQL, Docker, LuaLaTeX.',M,696,CW,9,12.5,MUT)
focus('The editor displays the compiled document. Downloading compiles the latest content.',723)
link('Open product','https://larpyourresume.com',M,781,8.5)
link('Original LaTeX template','https://github.com/ardatas/ResumeTemplate',M+117,781,8.5)
foot()

# 3: design
start('01 / Interface and AI workflow','Designing the resume workspace','A visual identity and editing flow built around a concrete task: preparing the next application.')
img(AS/'larp-live.png',M,183,CW,287)
para('Live landing page, captured 13 October 2026. The interface uses a black, white, and blue palette.',M,480,CW,8.2,11.5,MUT)
block('Visual design','I developed the product interface and landing page around classical imagery and a restrained color palette. Large display type establishes the identity; simple labels and structured controls explain the workflow.',M,517,col)
block('Sisyphus AI assistant','The implemented generation flow combines resume text with job context and user instructions. Typed document contracts constrain the output before it enters the editor. Users can continue editing the generated content.',x2,517,col)
rect(M,654,CW,59,PALE)
section('Availability',M+12,665)
para('The free editor and PDF downloads are publicly offered. The live site currently labels AI allowances and paid plans as coming soon.',M+12,683,CW-24,9.5,13)
focus('The same product connects visual design, document editing, and the underlying generation workflow.',726)
link('Explore the workspace and design','https://larpyourresume.com',M,782,8.5)
foot()

# 4 Werkio
start('02 / Full-stack AI workflows','Werkio','A student job platform and browser extension for reviewed, AI-assisted applications.')
section('Application workflow / schematic',M,186)
# stacked architecture rows with controlled arrows
for y,title,detail in [(211,'1. Read the application form','The extension extracts supported visible fields and job context.'),(292,'2. Prepare a review plan','The backend validates proposed values and their supporting evidence.'),(373,'3. Review and fill','The user checks the plan; the extension applies supported values.'),(454,'4. Submit manually','Final submission remains a user action.')]:
    rect(M,y,CW,63,PALE)
    tx(title,M+15,y+13,12,'Bold');para(detail,M+15,y+34,CW-30,9.8,13)
    if y<454:
        line(M+CW/2,y+65,M+CW/2,y+77,BLUE,1.4)
        c.setFillColor(BLUE);p=c.beginPath();p.moveTo(M+CW/2,H-y-79);p.lineTo(M+CW/2-3,H-y-74);p.lineTo(M+CW/2+3,H-y-74);p.close();c.drawPath(p,fill=1,stroke=0)
block('My contribution','I built the React frontend, Spring Boot backend, and TypeScript extension. Gemini supports form mapping and cover-letter drafting from approved facts. Workflow state explains failures and invalidates stale plans when the page changes.',M,543,col)
block('Reliability work','I added structured-output validation, evidence checks, access controls, and CSRF protection. Playwright scenarios cover preserving user edits, sensitive-field handling, provider failures, and manual submission. These are controlled test fixtures.',x2,543,col)
para('<b>Stack:</b> React, Java/Spring Boot, TypeScript, PostgreSQL, Flyway, Gemini, Playwright.',M,696,CW,9,12.5,MUT)
focus('The difficult part is the boundary between an AI suggestion and a permitted browser action.',723)
link('Open Werkio','https://getwerkio.com',M,781,8.5)
link('Project description','https://ardatas.com/projects/amogus.html',M+112,781,8.5)
foot()

# 5 CHECK24
start('03 / Protocol and API engineering','CHECK24 MCP App','One ChatGPT-facing Model Context Protocol endpoint for four mocked product services.')
img(AS/'check24-dashboard.png',M,186,CW,198,crop=(40,18,1210,474))
para('Local application screenshot, 13 October 2026. The demo catalog exposes 11 tools and withholds one invalid tool. All product data is mocked.',M,394,CW,8.3,11.5,MUT)
block('What I built','For the CHECK24 GenDev scholarship task, I built a TypeScript proxy for hotel, flight, package-holiday, and insurance tools. Stable namespaced tool names map to the original service tools behind one public catalog.',M,443,col)
block('Validation at the boundary','AJV validates tool schemas and incoming arguments. If a tool declares structured output, the proxy validates that too. Invalid tools are withheld with a rule, severity, and a suggested fix exposed in JSON and the dashboard.',x2,443,col)
rect(M,581,CW,91,PALE)
section('A concrete failure case',M+13,594)
para('The insurance mock intentionally omits an input schema for one tool. The proxy withholds it and reports <font face="Mono">inputSchema_missing</font>. Reviewers can inspect the same validation boundary through service-specific QA routes.',M+13,614,CW-26,10,14)
para('<b>Stack:</b> TypeScript, Node.js, Express, MCP SDK, AJV, Vitest, Docker Compose.',M,690,CW,9,12.5,MUT)
focus('A usable tool catalog needs explicit validation failures and traceable routing, as well as aggregation.',723)
link('Public source and setup instructions','https://github.com/ardatas/check24-chatgpt-app',M,781,8.5)
foot()

# 6 AIS
start('04 / Research software','Industrial data pipeline','Student assistant work at TUM AIS: visual workflows for industrial time-series processing.')
section('System architecture / schematic',M,186)
bw=(CW-28)/3
for i,(title,desc) in enumerate([('Visual workflow','PySide6 editor'),('Processing JSON','Shared execution contract'),('Pipeline runner','In-process Qt worker')]):
    x=M+i*(bw+14);rect(x,212,bw,72,PALE);tx(title,x+11,226,11,'Bold');para(desc,x+11,248,bw-22,9,12)
    if i<2:arrow(x+bw+2,248,x+bw+12,248)
rect(M,311,CW,148,INK)
tx('HDF5 output structure',M+15,328,12,'Bold',white)
tx('Raw-Data/.../MeasurementData',M+15,357,10,'Mono',white)
tx('Runs/<run-id>/.../MeasurementData',M+15,381,10,'Mono',white)
para('Each compound record keeps Timestamp_float and Value together. Timestamped run groups retain outputs from successive executions.',M+15,410,CW-30,10,14,HexColor('#D6E2EB'))
para('Conceptual diagram based on the implementation. No industrial measurements are shown.',M,470,CW,8.3,11.5,MUT)
block('My contribution','I develop the desktop workflow application and integrate it with the existing Python processing pipeline. My work includes connected workflow chains, GUI-to-JSON compilation, HDF5 layout updates, and documentation of the shared contracts.',M,509,col)
block('Data integrity in practice','CSV import sorts whole compound records by timestamp, so time/value pairs stay aligned. Processing runs can use a separate HDF5 working copy. Raw inputs remain available while timestamped result groups support comparison between runs.',x2,509,col)
para('<b>Stack:</b> Python, PySide6, NumPy, SciPy, h5py/HDF5.<br/><b>Scope:</b> contribution to an existing research codebase; the diagram summarizes the integration.',M,672,CW,9,13,MUT)
focus('The visual workflow, executable JSON, and stored data must agree on addressing and structure.',723)
link('Project description','https://ardatas.com/projects/tum-ais.html',M,781,8.5)
link('TUM AIS','https://www.mec.ed.tum.de/en/ais/homepage/',M+135,781,8.5)
foot()

# 7 Julia
start('05 / Performance engineering','Julia Set Explorer','A team-built C renderer, with an interactive WebAssembly version on my portfolio.')
img(AS/'julia-full.png',M,183,257,194,crop=(165,110,855,630))
rect(M+275,183,CW-275,194,PALE)
tx('Native render time',M+289,199,12,'Bold')
tx('Lower is better',M+289,222,8,'Sans',MUT)
for y,label,value,colour in [(249,'Scalar',13.18,MUT),(294,'SIMD',4.30,BLUE)]:
    tx(label,M+289,y,9,'Bold');tx(f'{value:.2f} ms',M+403,y,9,'Bold')
    rect(M+289,y+18,179*value/13.18,13,colour)
tx('3.1x faster',M+289,343,19,'Bold',BLUE)
para('Left: color output captured from the browser explorer. Right: the team report\'s native C benchmark, using grayscale output; these are separate rendering contexts.',M,389,CW,8.3,11.5,MUT)
block('My contribution','I profiled the SIMD implementation and investigated the active-mask bottleneck. I fixed escaped-lane reactivation, replaced masked addition with subtraction, added monotonic timing and BMP dimension checks, and designed correctness and performance experiments.',M,443,col)
block('How the renderer works','SIMD processes four pixels in parallel. Each lane iterates the Julia recurrence until it escapes or reaches the iteration limit. Active masks keep escaped lanes inactive. A scalar fallback handles widths that do not fill a complete SIMD group.',x2,443,col)
rect(M,590,CW,99,PALE)
section('Benchmark and correctness evidence',M+12,602)
para('Reported mean over 100 runs: <b>13.18 ms scalar</b> and <b>4.30 ms SIMD</b> at 800 x 600 pixels and 100 iterations. Hardware: AMD Ryzen 9 5950X; compiler: GCC 14.2.0, C17, -O3, -msse4.2. The team report records byte-identical SHA-256 comparisons across more than 30 scenarios.',M+12,623,CW-24,9.4,13.2)
para('The core SIMD implementation was written by a teammate. My focus was profiling, correctness fixes, experiments, and performance visualization. Timings are reported project results.',M,698,CW,8.6,12,MUT)
focus('Performance work needs a reference implementation and tests for lane divergence and edge cases.',735)
link('Interactive explorer','https://ardatas.com/julia/',M,785,8)
link('Public source, report, and contributions','https://github.com/ardatas/gra26capsproject',M+135,785,8)
foot()

c.save()
(ROOT/'portfolio-text.txt').write_text('\n'.join(content))
print(OUT)
