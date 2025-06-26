export interface Subgoal {
    description: string;
    status: 'pending' | 'current' | 'completed';
}

export interface PlanContext {
    goal: string;
    subGoals: Subgoal[];
    actions: string[];
    notes: string[];
}

export class Planner {
    private planStack: PlanContext[] = [];

    // Add a new goal to the plan stack
    addGoal(goal: string): void {
        this.planStack.push({
            goal,
            subGoals: [],
            actions: [],
            notes: []
        });
    }

    // Get the current active plan
    getCurrentPlan(): PlanContext | undefined {
        return this.planStack[this.planStack.length - 1];
    }

    // Get all plans in the stack
    getAllPlans(): PlanContext[] {
        return [...this.planStack];
    }

    // Get the depth of the plan stack
    getPlanDepth(): number {
        return this.planStack.length;
    }

    // Check if there are any active plans
    hasActivePlans(): boolean {
        return this.planStack.length > 0;
    }

    // Add subgoals to the current plan
    addSubgoals(subgoalDescriptions: string[]): boolean {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return false;

        const validDescriptions = subgoalDescriptions.filter(desc => desc && desc.trim());
        if (validDescriptions.length === 0) return false;

        const wasEmpty = currentPlan.subGoals.length === 0;
        
        if (wasEmpty) {
            // No existing subgoals - just add the new ones
            const newSubgoals: Subgoal[] = validDescriptions.map((description, index) => ({
                description: description.trim(),
                status: index === 0 ? 'current' : 'pending'
            }));
            currentPlan.subGoals.push(...newSubgoals);
        } else {
            // Find the current subgoal and replace it with new subgoals
            const currentIndex = currentPlan.subGoals.findIndex(sg => sg.status === 'current');
            
            if (currentIndex >= 0) {
                // Create new subgoals - first one becomes current
                const newSubgoals: Subgoal[] = validDescriptions.map((description, index) => ({
                    description: description.trim(),
                    status: index === 0 ? 'current' : 'pending'
                }));
                
                // Replace the current subgoal with the new subgoals at its position
                currentPlan.subGoals.splice(currentIndex, 1, ...newSubgoals);
            } else {
                // No current subgoal found - add at the end
                const newSubgoals: Subgoal[] = validDescriptions.map((description, index) => ({
                    description: description.trim(),
                    status: index === 0 ? 'current' : 'pending'
                }));
                currentPlan.subGoals.push(...newSubgoals);
            }
        }
        
        return true;
    }

    // Remove the last subgoal from the current plan
    removeLastSubgoal(): string | null {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan || currentPlan.subGoals.length === 0) {
            return null;
        }

        const removedSubgoal = currentPlan.subGoals.pop();
        if (!removedSubgoal) return null;

        // If we removed the current subgoal, make the previous one current
        if (removedSubgoal.status === 'current' && currentPlan.subGoals.length > 0) {
            const lastSubgoal = currentPlan.subGoals[currentPlan.subGoals.length - 1];
            if (lastSubgoal.status === 'pending') {
                lastSubgoal.status = 'current';
            }
        }

        return removedSubgoal.description;
    }

    // Complete the current subgoal and move to the next one
    completeCurrentSubgoal(): { completed: string | null; next: string | null; allCompleted: boolean } {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan || currentPlan.subGoals.length === 0) {
            return { completed: null, next: null, allCompleted: false };
        }

        // Find current subgoal and mark it as completed
        const currentSubgoal = currentPlan.subGoals.find(sg => sg.status === 'current');
        if (!currentSubgoal) {
            return { completed: null, next: null, allCompleted: false };
        }

        currentSubgoal.status = 'completed';

        // Find next pending subgoal and make it current
        const nextSubgoal = currentPlan.subGoals.find(sg => sg.status === 'pending');
        if (nextSubgoal) {
            nextSubgoal.status = 'current';
            return { 
                completed: currentSubgoal.description, 
                next: nextSubgoal.description, 
                allCompleted: false 
            };
        }

        // All subgoals are completed
        return { 
            completed: currentSubgoal.description, 
            next: null, 
            allCompleted: true 
        };
    }

    // Add an action to the current plan
    addAction(action: string): boolean {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return false;

        currentPlan.actions.push(action);
        return true;
    }

    // Add a note to the current plan
    addNote(note: string): boolean {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return false;

        currentPlan.notes.push(note);
        return true;
    }

    // Get recent actions from the current plan
    getRecentActions(limit: number = 3): string[] {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return [];

        return currentPlan.actions.slice(-limit);
    }

    // Get notes from the current plan
    getCurrentNotes(): string[] {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return [];

        return [...currentPlan.notes];
    }

    // Get summary of all plans for final output
    getSummary(): Array<{ goal: string; actions: string[] }> {
        return this.planStack.map(plan => ({
            goal: plan.goal,
            actions: [...plan.actions]
        }));
    }

    // Get detailed summary including subgoal statuses
    getDetailedSummary(): Array<{ goal: string; subgoals: Subgoal[]; actions: string[]; notes: string[] }> {
        return this.planStack.map(plan => ({
            goal: plan.goal,
            subgoals: [...plan.subGoals],
            actions: [...plan.actions],
            notes: [...plan.notes]
        }));
    }

    // Clear all plans (useful for resetting)
    clear(): void {
        this.planStack = [];
    }

    // Get all subgoals for the current plan
    getSubgoals(): Subgoal[] {
        const currentPlan = this.getCurrentPlan();
        return currentPlan ? [...currentPlan.subGoals] : [];
    }

    // Get subgoal descriptions only (for backwards compatibility)
    getSubgoalDescriptions(): string[] {
        const currentPlan = this.getCurrentPlan();
        return currentPlan ? currentPlan.subGoals.map(sg => sg.description) : [];
    }

    // Check if current plan has subgoals
    hasSubgoals(): boolean {
        const currentPlan = this.getCurrentPlan();
        return currentPlan ? currentPlan.subGoals.length > 0 : false;
    }

    // Get current active subgoal
    getCurrentSubgoal(): Subgoal | null {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return null;
        
        return currentPlan.subGoals.find(sg => sg.status === 'current') || null;
    }

    // Get current subgoal description
    getCurrentSubgoalDescription(): string | null {
        const currentSubgoal = this.getCurrentSubgoal();
        return currentSubgoal ? currentSubgoal.description : null;
    }

    // Get subgoals by status
    getSubgoalsByStatus(status: 'pending' | 'current' | 'completed'): Subgoal[] {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return [];
        
        return currentPlan.subGoals.filter(sg => sg.status === status);
    }
}