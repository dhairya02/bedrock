from __future__ import print_function, unicode_literals

import re

from django.conf import settings
from django.core.management.base import BaseCommand


ROOT = settings.ROOT_PATH
PIPELINE_RE = re.compile(r"\{\% (stylesheet|javascript) '([^']+)' \%\}")
SPACE_RE = re.compile(r'^\s+')
BUNDLES = {
    'javascript': settings.PIPELINE['JAVASCRIPT'],
    'stylesheet': settings.PIPELINE['STYLESHEETS'],
}
STYLE_TEMPLATE = '<link href="{{ static(\'%s\') }}" rel="stylesheet" type="text/css" />'
JS_TEMPLATE = '<script type="text/javascript" src="{{ static(\'%s\') }}" charset="utf-8"></script>'


def get_leading_space(line):
    match = SPACE_RE.match(line)
    if match:
        return match.group(0)

    return ''


class Command(BaseCommand):
    """Command to convert all templates from Pipeline bundles to individual assets.

    TODO: Delete me after pipeline removal.
    """
    def handle(self, *args, **options):
        for template in ROOT.glob('bedrock/*/templates/**/*.html'):
            print('===============')
            print(template)
            lines = []
            with template.open('r') as tf:
                for line in tf:
                    match = PIPELINE_RE.search(line)
                    if match:
                        print(line)
                        mtype, bundle = match.groups()
                        indent = get_leading_space(line)
                        bundle_files = BUNDLES[mtype][bundle]['source_filenames']
                        line_tpl = STYLE_TEMPLATE if mtype == 'stylesheet' else JS_TEMPLATE
                        for bf in bundle_files:
                            if bf.endswith('.scss') or bf.endswith('.less'):
                                bf = bf[:-5] + '.css'
                            lines.append(indent + line_tpl % bf + '\n')
                            print(lines[-1])
                    else:
                        lines.append(line)

            with template.open('w') as tf:
                tf.writelines(lines)
