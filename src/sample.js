// The "Try it with an example" paste: a short Canvas-style page with the usual
// problems (fake headings, a split due date, vague links, an image with no
// description, low-contrast red, typed bullets and emoji), so people can see what
// the page does before they paste their own content.

const image =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="200" viewBox="0 0 480 200">' +
      '<rect width="480" height="200" fill="#e8f0fe"/>' +
      '<rect x="40" y="120" width="60" height="50" fill="#4f8cff"/>' +
      '<rect x="130" y="80" width="60" height="90" fill="#4f8cff"/>' +
      '<rect x="220" y="50" width="60" height="120" fill="#4f8cff"/>' +
      '<rect x="310" y="100" width="60" height="70" fill="#4f8cff"/>' +
      '<rect x="30" y="170" width="360" height="2" fill="#5f6368"/>' +
      '</svg>',
  );

export const sampleHtml = `
<div class="user_content">
<p><span style="font-size: 18pt;"><strong>Week 3: Finding Good Sources</strong></span></p>
<p>This week we practice finding and judging sources. 📚 Start with the overview below.</p>
<p>&nbsp;</p>
<p><span style="font-size: 14pt;"><strong>What to do</strong></span></p>
<p>• Read the library guide</p>
<p>• Watch the short video on databases</p>
<p>• Finish the source worksheet</p>
<p>The library guide is <a href="https://example.instructure.com/courses/123/pages/library-research-guide">here</a>.</p>
<p>Turn in the worksheet: <a href="https://example.instructure.com/courses/123/assignments/45678">click here</a>.</p>
<p><strong>Due Friday</strong></p>
<p><strong>&nbsp;at 11:59pm</strong></p>
<p><span style="font-size: 14pt;"><strong>Survey results</strong></span></p>
<p><img src="${image}"></p>
<p><span style="color: #e03e2d;">Late work is not accepted.</span></p>
<p>Questions go in the discussion board. 🎉</p>
</div>`;
