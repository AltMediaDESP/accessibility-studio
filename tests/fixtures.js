// Sample clipboard HTML, written to match what each program puts on the clipboard.
// These are hand-made stand-ins: real pastes from the team's own courses should be
// added here as they turn up (see README, "Adding a test paste").

// Canvas page: styled spans instead of headings, a due date split across lines,
// vague links, an image with no alt text, emoji and empty spacer paragraphs.
export const canvasPage = `
<meta charset="utf-8"><div class="user_content">
<p><span style="font-size: 18pt;"><strong>Week 3: Research Skills</strong></span></p>
<p>This week we practice finding sources. 📚 Read the overview first.</p>
<p>&nbsp;</p>
<p><span style="font-size: 14pt;"><strong>Readings</strong></span></p>
<p>The first reading is short. In class we will compare notes.</p>
<p>Find the library guide <a href="https://example.instructure.com/courses/123/pages/library-research-guide" target="_blank">here</a>.</p>
<p>Submit the worksheet <a class="instructure_file_link" href="https://example.instructure.com/courses/123/assignments/45678">click here</a>.</p>
<p><strong>Due Friday</strong></p>
<p><span><strong>&nbsp;at 11:59pm</strong></span></p>
<p><img src="https://example.instructure.com/courses/123/files/9/preview"></p>
<p><span style="color: #e03e2d;">Late work is not accepted.</span></p>
<p><span style="color: #2d3b45;">Questions go in the discussion board. 🎉</span></p>
</div>`;

// Microsoft Word: MsoNormal paragraphs, list items with an mso-list "Ignore" bullet,
// <o:p> tags and a heading made with a large bold font.
export const wordDoc = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"><body lang=EN-US>
<!--StartFragment-->
<p class=MsoNormal><b><span style='font-size:16.0pt;font-family:"Calibri",sans-serif'>Lab Safety<o:p></o:p></span></b></p>
<p class=MsoNormal><span style='font-size:11.0pt'>Follow these rules in every lab.<o:p></o:p></span></p>
<p class=MsoListParagraphCxSpFirst style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]><span style='font-size:11.0pt'>Wear goggles<o:p></o:p></span></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]><span style='font-size:11.0pt'>Tie back long hair<o:p></o:p></span></p>
<p class=MsoNormal><u><span style='font-size:11.0pt'>Never eat in the lab.</span></u><o:p></o:p></p>
<!--EndFragment-->
</body></html>`;

// Google Docs: the whole paste is wrapped in <b style="font-weight:normal">, bold is
// a span with font-weight:700, list items wrap a <p>, and there is a table.
export const googleDoc = `
<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1234abcd-7fff-1234-abcd-1234567890ab">
<h2 dir="ltr" style="line-height:1.38;margin-top:18pt;margin-bottom:6pt;"><span style="font-size:16pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;">Grading</span></h2>
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;">Your grade has </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:700;">three parts</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;font-style:italic;">, weighted below</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;">.</span></p>
<br>
<div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;"><colgroup><col width="200"><col width="100"></colgroup><tbody>
<tr style="height:0pt"><td style="border:solid #000000 1pt;"><p dir="ltr"><span style="font-size:11pt;font-weight:700;">Part</span></p></td><td style="border:solid #000000 1pt;"><p dir="ltr"><span style="font-size:11pt;font-weight:700;">Weight</span></p></td></tr>
<tr style="height:0pt"><td style="border:solid #000000 1pt;"><p dir="ltr"><span style="font-size:11pt;font-weight:400;">Essays</span></p></td><td style="border:solid #000000 1pt;"><p dir="ltr"><span style="font-size:11pt;font-weight:400;">50%</span></p></td></tr>
<tr style="height:0pt"><td style="border:solid #000000 1pt;"><p dir="ltr"><span style="font-size:11pt;font-weight:400;">Quizzes</span></p></td><td style="border:solid #000000 1pt;"><p dir="ltr"><span style="font-size:11pt;font-weight:400;">30%</span></p></td></tr>
</tbody></table></div>
<h4 dir="ltr"><span style="font-size:12pt;font-weight:700;">Extra credit</span></h4>
<ul style="margin-top:0;margin-bottom:0;"><li dir="ltr" style="list-style-type:disc;"><p dir="ltr" role="presentation"><span style="font-size:11pt;font-weight:400;">Attend a lecture</span></p></li></ul>
</b>`;

// PowerPoint (pasted through the browser): nested divs and typed bullets.
export const powerPoint = `
<div><div><div style="font-size:28pt;font-weight:bold">Photosynthesis</div>
<div style="font-size:18pt">• Plants turn light into energy</div>
<div style="font-size:18pt">• It happens in the chloroplasts</div>
<div style="font-size:18pt">• Oxygen is released</div></div></div>`;
