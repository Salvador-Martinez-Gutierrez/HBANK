import fs from 'fs'
import path from 'path'

const base = path.join('.next', 'types')

function walk(dir) {
    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file)
        if (fs.statSync(full).isDirectory()) walk(full)
        else if (file.endsWith('.ts')) {
            let code = fs.readFileSync(full, 'utf8')

            // Arreglar rutas con backslash → slash
            code = code.replace(/\\\\/g, '/')

            // Quitar extensión .js en imports
            code = code.replace(/\.js(["'])/g, '$1')

            fs.writeFileSync(full, code)
        }
    }
}

if (fs.existsSync(base)) {
    walk(base)
    console.log('✅ Validators normalizados')
}
