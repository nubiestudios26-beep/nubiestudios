const fs = require('fs');
const path = require('path');

const csvData = fs.readFileSync(path.join(__dirname, 'prefixes.csv'), 'utf8');
const lines = csvData.trim().split('\n');

let phoneOptionsHTML = '';
let countryOptionsHTML = '';

// Default Thailand first
phoneOptionsHTML += `                                                <option value="+66">Thailand +66</option>\n`;
countryOptionsHTML += `                                                <option value="Thailand">Thailand</option>\n`;

// Process the rest
for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    let lastComma = line.lastIndexOf(',');
    if (lastComma === -1) continue;
    
    let country = line.substring(0, lastComma).replace(/"/g, '').trim();
    let code = line.substring(lastComma + 1).trim();
    
    if (country.toLowerCase() === 'thailand') continue;
    
    phoneOptionsHTML += `                                                <option value="+${code}">${country} +${code}</option>\n`;
    countryOptionsHTML += `                                                <option value="${country}">${country}</option>\n`;
}

function processHtmlFile(fileName) {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${fileName}`);
        return;
    }
    let htmlContent = fs.readFileSync(filePath, 'utf8');
    
    // 1. Replace Phone Prefixes (.phone-prefix-select)
    const phoneRegex = /(<select[^>]*class="[^"]*phone-prefix-select[^"]*"[^>]*>)([\s\S]*?)(<\/select>)/g;
    htmlContent = htmlContent.replace(phoneRegex, (match, p1, p2, p3) => {
        const matchIndex = htmlContent.indexOf(p1);
        let lastNewline = htmlContent.lastIndexOf('\n', matchIndex);
        let indent = lastNewline !== -1 ? htmlContent.substring(lastNewline + 1, matchIndex) : '';
        let customIndentHTML = phoneOptionsHTML.split('\n').map(l => l.trim() ? indent + '    ' + l.trim() : '').join('\n') + '\n';
        return p1 + '\n' + customIndentHTML + indent + p3;
    });

    // 2. Replace Countries (.country-select)
    const countryRegex = /(<select[^>]*class="[^"]*country-select[^"]*"[^>]*>)([\s\S]*?)(<\/select>)/g;
    htmlContent = htmlContent.replace(countryRegex, (match, p1, p2, p3) => {
        const matchIndex = htmlContent.indexOf(p1);
        let lastNewline = htmlContent.lastIndexOf('\n', matchIndex);
        let indent = lastNewline !== -1 ? htmlContent.substring(lastNewline + 1, matchIndex) : '';
        let customIndentHTML = countryOptionsHTML.split('\n').map(l => l.trim() ? indent + '    ' + l.trim() : '').join('\n') + '\n';
        return p1 + '\n' + customIndentHTML + indent + p3;
    });

    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`Updated ${fileName}`);
}

processHtmlFile('account.html');
processHtmlFile('register.html');
processHtmlFile('checkout.html');
processHtmlFile('account/personal-data.html');
