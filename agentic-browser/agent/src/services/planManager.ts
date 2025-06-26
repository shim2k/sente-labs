/* Minimal branching / pruning manager for AgentService */

export type SubGoalStatus = 'PENDING' | 'CURRENT' | 'DONE';

export interface SubGoal {
  goal: string;
  status: SubGoalStatus;
  startedAt: number | null;
}

export interface PlanNode {
  goal: string;
  subGoals: SubGoal[];
  actions: string[];
  notes: string[];
  startedAt: number;
  completedAt?: number;
}

export class PlanManager {
  private stack: PlanNode[] = [];
  private static MAX_DEPTH = 3;
  private static SUBGOAL_TIMEOUT_MS = 30000; // 30 seconds per subgoal
  private static GOAL_TIMEOUT_MS = 120000; // 2 minutes per goal

  /* ─── high-level api ─── */
  pushGoal(goal: string): void {
    this.stack.push(this.createPlanNode(goal));
  }

  updateSubGoals(arr: string[]): void {
    const current = this.current();
    if (!current) return;

    const filtered = arr.filter(s => s.trim());
    if (!filtered.length) return;

    // Prevent runaway nesting: only allow a few levels deep
    if (this.stack.length >= PlanManager.MAX_DEPTH) return;

    // Find current subgoal index
    const currentSubGoalIndex = current.subGoals.findIndex(sg => sg.status === 'CURRENT');
    
    // Keep completed and current subgoals, replace the rest
    const keepUpTo = currentSubGoalIndex === -1 ? 0 : currentSubGoalIndex + 1;
    const keptSubGoals = current.subGoals.slice(0, keepUpTo);
    
    // Create new subgoals with PENDING status
    const newSubGoals = filtered.map(goal => ({
      goal,
      status: 'PENDING' as SubGoalStatus,
      startedAt: null
    }));

    const updatedSubGoals = [...keptSubGoals, ...newSubGoals];
    
    // If no current subgoal exists, start the first one
    if (currentSubGoalIndex === -1 && updatedSubGoals.length > 0) {
      updatedSubGoals[0] = {
        ...updatedSubGoals[0],
        status: 'CURRENT',
        startedAt: Date.now()
      };
    }

    // Update with new immutable plan node
    this.stack[this.stack.length - 1] = {
      ...current,
      subGoals: updatedSubGoals
    };
  }

  completeSubGoal(): boolean {
    const current = this.current();
    if (!current) return false;

    const currentIndex = current.subGoals.findIndex(sg => sg.status === 'CURRENT');
    if (currentIndex === -1) return false;

    const updatedSubGoals = current.subGoals.map((sg, index) => {
      if (index === currentIndex) {
        return { ...sg, status: 'DONE' as SubGoalStatus };
      }
      if (index === currentIndex + 1) {
        // Start next subgoal
        return { ...sg, status: 'CURRENT' as SubGoalStatus, startedAt: Date.now() };
      }
      return sg;
    });

    // Update with new immutable plan node
    this.stack[this.stack.length - 1] = {
      ...current,
      subGoals: updatedSubGoals
    };

    // Check if all subgoals are done
    const allDone = updatedSubGoals.every(sg => sg.status === 'DONE');
    if (allDone) {
      // Mark the goal as completed
      this.stack[this.stack.length - 1] = {
        ...this.stack[this.stack.length - 1],
        completedAt: Date.now()
      };
    }

    return allDone;
  }

  pruneSubGoal(): void {
    const current = this.current();
    if (!current || current.subGoals.length === 0) return;

    // Remove the last subgoal
    const updatedSubGoals = current.subGoals.slice(0, -1);
    
    // Adjust current pointer if needed
    const currentIndex = updatedSubGoals.findIndex(sg => sg.status === 'CURRENT');
    const adjustedSubGoals = currentIndex >= updatedSubGoals.length 
      ? updatedSubGoals.map((sg, index) => 
          index === updatedSubGoals.length - 1 
            ? { ...sg, status: 'CURRENT' as SubGoalStatus, startedAt: Date.now() }
            : sg
        )
      : updatedSubGoals;

    // Update with new immutable plan node
    this.stack[this.stack.length - 1] = {
      ...current,
      subGoals: adjustedSubGoals
    };
  }

  /**
   * Pop completed goals from the stack to prevent ever-growing stack
   */
  popCompletedGoal(): boolean {
    const current = this.current();
    if (!current || !current.completedAt) return false;

    this.stack.pop();
    return true;
  }

  /**
   * Check for timeouts and return notes if any subgoals or goals are running too long
   */
  checkTimeouts(): string[] {
    const current = this.current();
    if (!current) return [];

    const notes: string[] = [];
    const now = Date.now();

    // Check goal timeout
    if (now - current.startedAt > PlanManager.GOAL_TIMEOUT_MS) {
      notes.push(`Goal "${current.goal}" has been running for ${Math.round((now - current.startedAt) / 1000)}s (timeout: ${PlanManager.GOAL_TIMEOUT_MS / 1000}s)`);
    }

    // Check current subgoal timeout
    const currentSubGoal = current.subGoals.find(sg => sg.status === 'CURRENT');
    if (currentSubGoal && currentSubGoal.startedAt && 
        now - currentSubGoal.startedAt > PlanManager.SUBGOAL_TIMEOUT_MS) {
      notes.push(`Subgoal "${currentSubGoal.goal}" has been running for ${Math.round((now - currentSubGoal.startedAt) / 1000)}s (timeout: ${PlanManager.SUBGOAL_TIMEOUT_MS / 1000}s)`);
    }

    return notes;
  }

  /* ─── private helpers ─── */
  private createPlanNode(goal: string): PlanNode {
    return {
      goal,
      subGoals: [],
      actions: [],
      notes: [],
      startedAt: Date.now()
    };
  }

  /* ─── public helpers ─── */
  current(): PlanNode | null { 
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null; 
  }
  
  depth(): number { 
    return this.stack.length; 
  }
  
  getStack(): PlanNode[] { 
    return [...this.stack]; // Return immutable copy
  }

  activeSubGoals(): string[] {
    const current = this.current();
    if (!current) return [];
    
    return current.subGoals.map(sg => {
      switch (sg.status) {
        case 'DONE':
          return `${sg.goal} (COMPLETED)`;
        case 'CURRENT':
          return `${sg.goal} (CURRENT)`;
        case 'PENDING':
        default:
          return sg.goal;
      }
    });
  }

  actions(): string[] { 
    const current = this.current();
    return current ? [...current.actions] : []; // Return immutable copy
  }
  
  notes(): string[] { 
    const current = this.current();
    return current ? [...current.notes] : []; // Return immutable copy
  }

  /**
   * Add an action to the current plan (returns new plan node)
   */
  addAction(action: string): void {
    const current = this.current();
    if (!current) return;

    this.stack[this.stack.length - 1] = {
      ...current,
      actions: [...current.actions, action]
    };
  }

  /**
   * Add a note to the current plan (returns new plan node)
   */
  addNote(note: string): void {
    const current = this.current();
    if (!current) return;

    this.stack[this.stack.length - 1] = {
      ...current,
      notes: [...current.notes, note]
    };
  }
} 