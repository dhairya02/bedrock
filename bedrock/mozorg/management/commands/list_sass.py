from __future__ import print_function, unicode_literals

import json

from django.core.management.base import BaseCommand

from bedrock.settings.static_media import PIPELINE_CSS


class Command(BaseCommand):
    """Command to list all .scss and .less files in bundles.

    TODO: Delete me after pipeline removal.
    """
    def handle(self, *args, **options):
        output = {
            'less': [],
            'sass': [],
        }
        for bundle in PIPELINE_CSS.values():
            for filename in bundle['source_filenames']:
                if filename.endswith('.less'):
                    output['less'].append(filename)
                elif filename.endswith('.scss'):
                    output['sass'].append(filename)

        print(json.dumps(output, indent=2))
