from markitdown import MarkItDown
from flask import Flask, request, jsonify
import os
import tempfile

app = Flask(__name__)
md = MarkItDown()


@app.route('/convert', methods=['POST'])
def convert():
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file provided'}), 400

        # Save to temp file, convert, then delete
        suffix = os.path.splitext(file.filename)[1] or '.bin'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            file.save(tmp_path)

        try:
            result = md.convert(tmp_path)
        finally:
            os.unlink(tmp_path)

        text = result.text_content or ''
        return jsonify({
            'text':   text,
            'title':  result.title or file.filename,
            'length': len(text),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'markitdown'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)
