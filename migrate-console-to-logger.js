#!/usr/bin/env node
/**
 * Script to migrate console.log/warn/error/debug/info calls to Pino logger
 *
 * This script:
 * 1. Adds logger import if not present
 * 2. Replaces console.log → logger.info
 * 3. Replaces console.error → logger.error
 * 4. Replaces console.warn → logger.warn
 * 5. Replaces console.debug → logger.debug
 * 6. Replaces console.info → logger.info
 */

const fs = require('fs');
const path = require('path');

// Files to migrate - API routes (remaining)
const apiRoutes = [
    '/Users/sergiobanuls/Documents/PERSONAL/HBANK-PROTOCOL/src/app/api/account-balances/route.ts',
    '/Users/sergiobanuls/Documents/PERSONAL/HBANK-PROTOCOL/src/app/api/history/route.ts',
    '/Users/sergiobanuls/Documents/PERSONAL/HBANK-PROTOCOL/src/app/api/get-latest-rate/route.ts',
    '/Users/sergiobanuls/Documents/PERSONAL/HBANK-PROTOCOL/src/app/api/rate-history/route.ts',
    '/Users/sergiobanuls/Documents/PERSONAL/HBANK-PROTOCOL/src/app/api/publish-rate/route.ts',
    '/Users/sergiobanuls/Documents/PERSONAL/HBANK-PROTOCOL/src/app/api/portfolio/update-prices/route.ts',
    '/Users/sergiobanuls/Documents/PERSONAL/HBANK-PROTOCOL/src/app/api/withdraw/route.ts',
    '/Users/sergiobanuls/Documents/PERSONAL/HBANK-PROTOCOL/src/app/api/deposit/route.ts',
];

// Configuration for different file types
const config = {
    'api': {
        importType: 'scoped',
        scope: (filepath) => {
            // Extract scope from path
            const match = filepath.match(/src\/app\/api\/([^/]+(?:\/[^/]+)?)\//);
            return match ? `api:${match[1].replace(/\//g, ':')}` : 'api:unknown';
        }
    },
    'service': {
        importType: 'scoped',
        scope: (filepath) => {
            const filename = path.basename(filepath, path.extname(filepath));
            return `service:${filename}`;
        }
    },
    'hook': {
        importType: 'default',
    },
    'component': {
        importType: 'default',
    },
    'domain': {
        importType: 'scoped',
        scope: (filepath) => {
            const match = filepath.match(/src\/domain\/([\w-]+)\/([\w-]+)/);
            return match ? `domain:${match[1]}:${path.basename(filepath, path.extname(filepath))}` : 'domain:unknown';
        }
    },
    'validation': {
        importType: 'scoped',
        scope: (filepath) => {
            const filename = path.basename(filepath, path.extname(filepath));
            return `validation:${filename}`;
        }
    },
};

function getFileType(filepath) {
    if (filepath.includes('/app/api/')) return 'api';
    if (filepath.includes('/services/') && filepath.includes('ValidationService')) return 'validation';
    if (filepath.includes('/services/')) return 'service';
    if (filepath.includes('/hooks/')) return 'hook';
    if (filepath.includes('/components/')) return 'component';
    if (filepath.includes('/domain/')) return 'domain';
    return 'default';
}

function addLoggerImport(content, fileType, filepath, cfg) {
    // Check if logger import already exists
    if (content.includes('from \'@/lib/logger\'') || content.includes('from "@/lib/logger"')) {
        return content;
    }

    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') && !lines[i].includes('type ')) {
            lastImportIndex = i;
        } else if (lastImportIndex >= 0 && lines[i].trim() && !lines[i].trim().startsWith('import')) {
            break;
        }
    }

    let importStatement;
    let loggerDeclaration;

    if (cfg.importType === 'scoped') {
        importStatement = "import { createScopedLogger } from '@/lib/logger'";
        const scope = cfg.scope(filepath);
        loggerDeclaration = `\nconst logger = createScopedLogger('${scope}')`;
    } else {
        importStatement = "import { logger } from '@/lib/logger'";
        loggerDeclaration = '';
    }

    if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, importStatement + loggerDeclaration);
    } else {
        // No imports found, add at the beginning
        lines.unshift(importStatement + loggerDeclaration, '');
    }

    return lines.join('\n');
}

function migrateConsoleStatements(content) {
    let modified = content;

    // Pattern to match console statements
    // This handles multi-line console statements
    const consolePattern = /console\.(log|error|warn|info|debug)\s*\([^)]*(?:\([^)]*\))*[^)]*\)/g;

    // For simpler replacement, we'll do line-by-line
    const lines = modified.split('\n');
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Skip if line is a comment
        if (line.trim().startsWith('//')) {
            newLines.push(line);
            continue;
        }

        // Simple single-line replacements
        if (line.includes('console.log(') || line.includes('console.error(') ||
            line.includes('console.warn(') || line.includes('console.info(') ||
            line.includes('console.debug(')) {

            // Replace console.log → logger.info
            line = line.replace(/console\.log\(/g, 'logger.info(');
            // Replace console.error → logger.error
            line = line.replace(/console\.error\(/g, 'logger.error(');
            // Replace console.warn → logger.warn
            line = line.replace(/console\.warn\(/g, 'logger.warn(');
            // Replace console.info → logger.info
            line = line.replace(/console\.info\(/g, 'logger.info(');
            // Replace console.debug → logger.debug
            line = line.replace(/console\.debug\(/g, 'logger.debug(');
        }

        newLines.push(line);
    }

    return newLines.join('\n');
}

function processFile(filepath) {
    console.log(`Processing: ${filepath}`);

    if (!fs.existsSync(filepath)) {
        console.warn(`  ⚠️  File not found: ${filepath}`);
        return { success: false, reason: 'not found' };
    }

    const fileType = getFileType(filepath);
    const cfg = config[fileType] || { importType: 'default' };

    let content = fs.readFileSync(filepath, 'utf-8');
    const originalContent = content;

    // Add logger import
    content = addLoggerImport(content, fileType, filepath, cfg);

    // Migrate console statements
    content = migrateConsoleStatements(content);

    if (content !== originalContent) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`  ✅ Migrated`);
        return { success: true, modified: true };
    } else {
        console.log(`  ⏭️  No changes needed`);
        return { success: true, modified: false };
    }
}

function main() {
    console.log('🚀 Starting console-to-logger migration...\n');

    const results = { total: 0, success: 0, modified: 0, failed: 0 };

    for (const filepath of apiRoutes) {
        results.total++;
        const result = processFile(filepath);
        if (result.success) {
            results.success++;
            if (result.modified) results.modified++;
        } else {
            results.failed++;
        }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total files: ${results.total}`);
    console.log(`   ✅ Successful: ${results.success}`);
    console.log(`   📝 Modified: ${results.modified}`);
    console.log(`   ❌ Failed: ${results.failed}`);
}

main();
