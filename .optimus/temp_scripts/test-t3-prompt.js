const path = require('path');
const fs = require('fs');
// Let's stub just the part we need
const role = "webgl-shader-guru";

const formattedRole = role
    .split(/[-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
let personaContext = `You are a ${formattedRole} expert operating within the Optimus Spartan Swarm. Your purpose is to fulfill tasks autonomously within your specialized domain of expertise.\nAs a dynamically provisioned "T3" agent, apply industry best practices, solve complex problems, and deliver professional-grade results associated with your role.`;

const systemInstructionsPath = path.join(__dirname, '.optimus', 'config', 'system-instructions.md');
if (fs.existsSync(systemInstructionsPath)) {
    const systemInstructions = fs.readFileSync(systemInstructionsPath, 'utf8');
    personaContext += `\n\n--- START WORKSPACE SYSTEM INSTRUCTIONS ---\n${systemInstructions.trim()}\n--- END WORKSPACE SYSTEM INSTRUCTIONS ---`;
}

console.log("---- GENERATED T3 PROMPT ----");
console.log(personaContext);
console.log("-----------------------------");
