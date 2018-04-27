from __future__ import print_function, unicode_literals

import json

from django.conf import settings
from django.core.management.base import BaseCommand


BUNDLES = {
    'stylesheet': settings.PIPELINE['STYLESHEETS'],
}


class Command(BaseCommand):
    """Command to list all .scss and .less files in bundles.

    TODO: Delete me after pipeline removal.
    """
    def handle(self, *args, **options):
        output = {
            'less': [],
            'sass': [],
        }
        for bundle in BUNDLES['stylesheet'].values():
            for filename in bundle['source_filenames']:
                if filename.endswith('.less'):
                    output['less'].append(filename)
                elif filename.endswith('.scss'):
                    output['sass'].append(filename)

        print(json.dumps(output, indent=2))
