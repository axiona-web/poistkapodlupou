from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
config = json.loads((root / 'config/insurance-links.json').read_text())
(root / 'web/links.js').write_text('window.INSURANCE_CONFIG = ' + json.dumps(config, ensure_ascii=False) + ';\n')
