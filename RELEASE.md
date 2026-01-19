# Release Process

## Creating a New Release

When a new release is published on GitHub, the `release.yaml` workflow will automatically:
1. Checkout the release tag
2. Update version numbers in `const.py` and `manifest.json`
3. Create a `keymaster.zip` file from the `custom_components/keymaster` directory
4. Upload the zip file to the release

## Manually Adding Release Asset to Existing Release

If a release was created before the workflow was set up, or if you need to manually add the `keymaster.zip` asset to an existing release:

1. Go to the [Actions](https://github.com/ncecowboy/keymaster/actions/workflows/release.yaml) tab
2. Select the "Release" workflow
3. Click "Run workflow"
4. Enter the tag name (e.g., `v0.1.0`)
5. Click "Run workflow"

The workflow will:
- Checkout the specified tag
- Create the `keymaster.zip` file with the correct version
- Upload it to the existing release

## HACS Requirements

The `hacs.json` file specifies:
```json
{
  "zip_release": true,
  "filename": "keymaster.zip"
}
```

This means HACS will look for a `keymaster.zip` file in each release. Without this file, users will get a 404 error when trying to install the integration via HACS.
