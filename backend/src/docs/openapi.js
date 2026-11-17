const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

module.exports = YAML.parse(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
