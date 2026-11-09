"""Android projesine Küp Arena'ya özel ayarları ekler (npx cap add android sonrası çalışır).
- kuparena://baglan dönüş bağlantısı: Rubik Academy sitesinden Google girişi sonrası oyuna dönüş.
"""
import re, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'android/app/src/main/AndroidManifest.xml'
s = open(path, encoding='utf-8').read()
if 'android:scheme="kuparena"' not in s:
    flt = '''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="kuparena" android:host="baglan" />
            </intent-filter>
'''
    s, n = re.subn(r'(\n\s*</activity>)', flt.rstrip('\n') + r'\1', s, count=1)
    if n != 1:
        sys.exit('MainActivity bulunamadı')
    open(path, 'w', encoding='utf-8').write(s)
print('AndroidManifest güncellendi')
