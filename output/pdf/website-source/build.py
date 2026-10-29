from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from PIL import Image

R=Path(__file__).resolve().parents[3]
S=Path(__file__).resolve().parent
O=S.parent/'Arda_Tas_Website_Portfolio.pdf'
for n,f in [('Sans','sans.ttf'),('Bold','sans-bold.ttf'),('Mono','mono.ttf'),('MB','mono-bold.ttf'),('MI','mono-italic.ttf')]:
 pdfmetrics.registerFont(TTFont(n,str(S/'fonts'/f)))
pdfmetrics.registerFontFamily('Sans',normal='Sans',bold='Bold',italic='Sans',boldItalic='Bold')
W,H=595.276,841.89
BG=HexColor('#f6f4ee'); INK=HexColor('#101114'); MUT=HexColor('#4b4b48'); BORDER=HexColor('#8f8d86'); CARD=HexColor('#b7b5ae'); BLUE=HexColor('#315f87')
c=canvas.Canvas(str(O),pagesize=(W,H),pageCompression=1)
c.setTitle('Arda Tas | Projects and experience');c.setAuthor('Arda Tas');c.setSubject('Selected projects from ardatas.com')
text=[]
def tx(s,x,y,size=10,font='Sans',color=INK):
 assert '\u2014' not in s and '\u2013' not in s
 text.append(s);c.setFont(font,size);c.setFillColor(color);c.drawString(x,H-y-size*.85,s)
def p(s,x,y,w,size=10.5,leading=14.5):
 assert '\u2014' not in s and '\u2013' not in s
 text.append(s);a=Paragraph(s,ParagraphStyle('p',fontName='Sans',fontSize=size,leading=leading,textColor=INK));_,h=a.wrap(w,H);a.drawOn(c,x,H-y-h);return y+h
def box(x,y,w,h,fill=white,stroke=CARD):
 c.setFillColor(fill);c.setStrokeColor(stroke);c.setLineWidth(.65);c.rect(x,H-y-h,w,h,fill=1,stroke=1)
def a(s,url,x,y,size=9):
 tx(s,x,y,size,'Sans',BLUE);width=pdfmetrics.stringWidth(s,'Sans',size);c.linkURL(url,(x,H-y-size-3,x+width,H-y+2),relative=0,thickness=0)
def im(path,x,y,w,h=None,crop=None,contain=False):
 z=Image.open(path)
 if crop:z=z.crop(crop)
 if h is None:h=w*z.height/z.width
 if contain:
  k=min(w/z.width,h/z.height);iw=z.width*k;ih=z.height*k;x+=(w-iw)/2;y+=(h-ih)/2;w=iw;h=ih
 c.drawImage(ImageReader(z),x,H-y-h,w,h,mask='auto')
def field(label,y,h):
 box(34,y,527,h,BG,BORDER);ww=pdfmetrics.stringWidth(label,'MI',13);c.setFillColor(BG);c.rect(45,H-y-7,ww+14,18,fill=1,stroke=0);tx(label,52,y-9,13,'MI')
def header(page):
 c.setFillColor(BG);c.rect(0,0,W,H,fill=1,stroke=0)
 tx('Arda Tas',34,28,23,'MB');a('ardatas.com','https://ardatas.com',34,57,9)
 for x,label,url in [(356,'LinkedIn','https://linkedin.com/in/arda-tas'),(464,'GitHub','https://github.com/ardatas')]:
  box(x,31,97,29,BG,BORDER);a(label,url,x+16,40,10)
 tx(f'{page} / 2',532,817,8,'Mono',MUT)
 a('arda@ardatas.com','mailto:arda@ardatas.com',34,817,8.5)
def logo(path,x,y):
 box(x,y,40,40,HexColor('#0065bd') if path and 'logo-tum.png' in str(path) else white,CARD)
 if path:im(path,x+4,y+4,32,32,contain=True)
def card(y,h,title,subtitle,body,focus,url,linklabel='Visit project',icon=None):
 box(47,y,501,h)
 if icon:logo(icon,59,y+13);titlex=109
 else:titlex=60
 tx(title,titlex,y+14,13,'Bold');p(subtitle,titlex,y+33,424 if not icon else 422,9.5,12.5)
 end=p(body,60,y+64,473,10.5,14)
 if focus:p('<b>Focus:</b> '+focus,60,end+7,473,10,13.3)
 a(linklabel,url,60,y+h-21,9)

header(1)
field('whoami',88,172)
im(R/'public/assets/arda-portrait.jpg',430,103,115,142,crop=(0,70,960,1255))
p("I'm Arda, a Computer Science student at TUM and a student assistant at the Institute of Automation and Information Systems in Munich.",51,108,359,11,15)
p('I build AI-assisted workflows, full-stack applications, and visual tools for data processing. I am also interested in parallel programming and high-performance computing.',51,166,359,11,15)
p('<b>What to look for:</b> practical products, user control, reliable software, and clear interfaces.',51,224,359,10.2,14)
field('ls ~/projects.md',282,509)
card(301,151,'larpyourresume','Resume editing and PDF generation',
 'I built a resume workspace with form and LaTeX editing, customizable layouts, autosave, and PDF export. I also developed Sisyphus, its AI assistant for tailoring resume content.',
 'Full-stack product development and interface design.',
 'https://larpyourresume.com','larpyourresume.com',R/'../larpyourresume/output/social/sisyphus-profile-original-black-on-white.png')
card(463,151,'Werkio','AI-assisted job application workflows',
 'I built a job platform and browser extension that use Gemini to map profile data to application forms and draft cover letters. Users review proposed changes and submit applications themselves.',
 'User control, validation, and end-to-end testing.',
 'https://getwerkio.com','getwerkio.com',R/'public/assets/logo-werkio.png')
card(625,151,'CHECK24 MCP App','One endpoint for four mocked product services',
 'I built a TypeScript proxy that connects ChatGPT to hotel, flight, package-holiday, and insurance tools. It validates requests, withholds invalid tools, and shows errors and call traces in a dashboard.',
 'API integration and clear error handling. All product data is mocked.',
 'https://github.com/ardatas/check24-chatgpt-app','GitHub: ardatas/check24-chatgpt-app')
c.showPage()

header(2)
field('ls ~/projects.md',89,512)
card(108,158,'Industrial data pipeline at TUM AIS','Visual workflows for industrial time-series processing',
 'As a student assistant, I develop a Python desktop application for building and running data-processing workflows. It connects a visual editor to CSV import, signal processing, and HDF5 data storage.',
 'Making processing steps visible and configurable.',
 'https://ardatas.com/projects/tum-ais.html','Read project details',R/'public/assets/logo-tum.png')
card(277,120,'Header','Frontend overhaul for the startup joinheader',
 'I redesigned the frontend for joinheader, an agentic coding startup.',
 'Frontend development and visual design.',
 'https://ardatas.com/projects/header.html','Project and preview link (preview requires access)',R/'public/assets/logo-header.png')
box(47,408,501,177)
tx('Julia Set Explorer',60,422,13,'Bold')
p('Interactive fractals built with C and WebAssembly',60,443,463,9.5,12.5)
p('In this team project, I focused on SIMD profiling, correctness fixes, and performance experiments. The interactive version is available on my website.',60,468,318,10.5,14)
p('<b>Focus:</b> performance optimization backed by correctness checks.',60,532,318,10,13.3)
im(R/'output/pdf/source/assets/julia-full.png',399,469,134,100,crop=(165,110,855,630))
a('Try the explorer','https://ardatas.com/julia/',60,566,9)
a('GitHub repository','https://github.com/ardatas/gra26capsproject',164,566,9)
field('cat ~/skills.md',624,104)
p('<b>Product engineering</b> &nbsp; React, Next.js, TypeScript, Java, Spring Boot, PostgreSQL',51,644,492,10.3,14)
p('<b>AI workflows and testing</b> &nbsp; Gemini, MCP, structured outputs, Playwright',51,671,492,10.3,14)
p('<b>Scientific computing</b> &nbsp; Python, NumPy, SciPy, PySide6, HDF5, C, SIMD',51,698,492,10.3,14)
field('cat ~/links.md',750,48)
a('Website','https://ardatas.com',51,769,10)
a('GitHub','https://github.com/ardatas',148,769,10)
a('LinkedIn','https://linkedin.com/in/arda-tas',238,769,10)
a('arda@ardatas.com','mailto:arda@ardatas.com',347,769,10)
c.showPage();c.save()
(S/'text.txt').write_text('\n'.join(text))
print(O)
