import fs from "fs";
import path from "path";
import { GitHubCopilotAdapter } from "../adapters/GitHubCopilotAdapter";

/**
 * Executes a single task delegation synchronously.
 */
export async function delegateTaskSingle(roleArg: string, taskPath: string, outputPath: string, sessionId: string, workspacePath: string): Promise<string> {
    const role = path.basename(roleArg); // Prevent path traversal
    
    // Auto-migrate legacy folder `.optimus/personas` to `.optimus/agents`
    const legacyT1Dir = path.join(workspacePath, '.optimus', 'personas');
    const t1Dir = path.join(workspacePath, '.optimus', 'agents');
    if (fs.existsSync(legacyT1Dir) && !fs.existsSync(t1Dir)) {
        try { fs.renameSync(legacyT1Dir, t1Dir); } catch(e) {}
    }
    
    const t1Path = path.join(t1Dir, `${role}.md`);
    const t2Path = path.join(__dirname, '..', '..', 'optimus-plugin', 'roles', `${role}.md`);

    let resolvedTier = 'T3 (Zero-Shot Outsource)';
    let personaProof = 'No dedicated role template found in T2 or T1. Using T3 generic prompt.';
    let shouldLocalize = false;

    if (fs.existsSync(t1Path)) {
      resolvedTier = `T1 (Agent Instance -> ${role}.md)`;
      personaProof = `Found local project agent state: ${t1Path}`;
    } else if (fs.existsSync(t2Path)) {
      resolvedTier = `T2 (Role Template -> ${role}.md)`;
      personaProof = `Found globally promoted Role template: ${t2Path}`;
      shouldLocalize = true;
    }

    console.error(`[Orchestrator] Resolving Identity for ${role}...`);
    console.error(`[Orchestrator] Selected Stratum: ${resolvedTier}`);

    if (shouldLocalize) {
      if (!fs.existsSync(t1Dir)) fs.mkdirSync(t1Dir, { recursive: true });
      try {
        const t2Content = fs.readFileSync(t2Path, 'utf8');
        // Atomic create-exclusive to prevent concurrent overwrite
        const fd = fs.openSync(t1Path, 'wx');
        const defaultMemory = `\n\n## Project Memory\n*Agent T1 Instantiated on ${new Date().toISOString()}*\n- (No memory appended yet)\n`;
        fs.writeFileSync(fd, t2Content + defaultMemory, 'utf8');
        fs.closeSync(fd);
        console.error(`[Orchestrator] Promoted T2 to T1: ${t1Path}`);
      } catch (e: any) {
        if (e.code === 'EEXIST') {
          console.error(`[Orchestrator] T1 promotion skipped (already done by another worker).`);
        } else {
          console.error(`[Orchestrator] T1 promotion failed:`, e);
          resolvedTier = 'T3 (Zero-Shot Outsource) [T2 read failed]';
        }
      }
    }

    const adapter = new GitHubCopilotAdapter(sessionId);

    const taskText = fs.existsSync(taskPath) ? fs.readFileSync(taskPath, 'utf8') : taskPath;

    let personaContext = "";
    if (fs.existsSync(t1Path)) {
        personaContext = fs.readFileSync(t1Path, "utf8");
    }

    const basePrompt = `You are a delegated AI Worker operating under the Spartan Swarm Protocol.
Your Role: ${role}
Identity: ${resolvedTier}

${personaContext ? `--- START PERSONA INSTRUCTIONS ---\n${personaContext}\n--- END PERSONA INSTRUCTIONS ---` : ''}

Goal: Execute the following task. 
System Note: ${personaProof}

Task Description:
${taskText}

Please provide your complete execution result below.`;

    try {
        const response = await adapter.invoke(basePrompt, "Exec" as any);
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(outputPath, response, 'utf8');
        return `✅ **Task Delegation Successful**\n\n**Agent Identity Resolved**: ${resolvedTier}\n**System Note**: ${personaProof}\n\nAgent has finished execution. Check standard output at \`${outputPath}\`.`;
    } catch (e: any) {
        throw new Error(`Worker execution failed: ${e.message}`);
    }
}

/**
 * Spawns a single expert worker process for council review.
 */
export async function spawnWorker(role: string, proposalPath: string, outputPath: string, sessionId: string, workspacePath: string): Promise<string> {
    try {
        console.error(`[Spawner] Launching Real Worker ${role} for council review`);
        return await delegateTaskSingle(role, `Please read the architectural PROPOSAL located at: ${proposalPath}. 
Provide your expert critique from the perspective of your role (${role}). Identify architectural bottlenecks, DX friction, security risks, or asynchronous race conditions. Conclude with a recommendation: Reject, Accept, or Hybrid.`, outputPath, sessionId, workspacePath);
    } catch (err: any) {
        console.error(`[Spawner] Worker ${role} failed to start:`, err);
        return `❌ ${role}: exited with errors (${err.message}).`;
    }
}

/**
 * Dispatches the council of experts concurrently.
 */
export async function dispatchCouncilConcurrent(roles: string[], proposalPath: string, reviewsPath: string, timestampId: string, workspacePath: string): Promise<string[]> {
  const promises = roles.map(role => {
    const outputPath = path.join(reviewsPath, `${role}_review.md`);
    return spawnWorker(role, proposalPath, outputPath, `${timestampId}_${Math.random().toString(36).slice(2,8)}`, workspacePath);
  });

  return Promise.all(promises);
}
