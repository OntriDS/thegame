export default function TestPDF() {
  return (
    <div className="min-h-screen w-full p-4">
      <h1 className="text-2xl font-bold mb-4">Test PDF Viewer</h1>
      
      <div className="w-full">
        <iframe 
          className="scribd_iframe_embed" 
          title="Cambridge International AS &amp; A Level Thinking Skills.pdf"
          src="https://www.scribd.com/embeds/644108566/content?start_page=1&view_mode=scroll&access_key=key-qW40roUeRoEgM7R0VoKd"
          data-auto-height="true"
          data-aspect-ratio="0.7729220222793488"
          width="100%"
          height="600"
          frameBorder="0"
          scrolling="no"
        />
      </div>
      
      <p style={{ margin: '12px auto 6px auto', fontFamily: 'Helvetica,Arial,Sans-serif', fontSize: '14px', lineHeight: 'normal', display: 'block' }}>
        <a 
          title="View Cambridge International AS &amp; A Level Thinking Skills.pdf on Scribd"
          href="https://www.scribd.com/document/644108566/Cambridge-International-AS-A-Level-Thinking-Skills-pdf#from_embed"
          style={{ color: '#098642', textDecoration: 'underline' }}
        >
          Cambridge International AS & A Level Thinking Skills.pdf
        </a>
        {' '}by{' '}
        <a 
          title="View Ena Artyukh's profile on Scribd"
          href="https://www.scribd.com/user/387463209/Ena-Artyukh#from_embed"
          style={{ color: '#098642', textDecoration: 'underline' }}
        >
          Ena Artyukh
        </a>
      </p>
    </div>
  );
}

