import subprocess, json, re, sys
from collections import Counter

result = subprocess.run(
    [sys.executable, 'fetch_radar.py'],
    capture_output=True, text=True,
    cwd=r'c:\Users\mahia\OneDrive\Desktop\NIVESH_AI_ETH\web\scripts'
)

match = re.search(r'\{[\s\S]*\}', result.stdout)
if match:
    d = json.loads(match.group())
    types = Counter(s['type'] for s in d['signals'])
    print('Signal type breakdown:')
    for t, count in types.items():
        print('  %s: %d' % (t, count))
    print()
    print('All signals:')
    for s in d['signals']:
        print('  [%s] %s (conf=%s%%)' % (s['type'], s['title'], s['confidence']))
    print()
    print('News count:', len(d['news']))
    print('STDERR:', result.stderr[:300] if result.stderr else 'none')
else:
    print('No JSON found')
    print('STDOUT:', result.stdout[:500])
    print('STDERR:', result.stderr[:500])
