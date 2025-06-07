import { Action } from '../../types';

export type InstructionType = 
  | 'simple_navigation'    // "go to linkedin", "visit google.com", "open github"
  | 'complex_interaction'  // "click the login button", "fill out form", "search for"
  | 'content_extraction'   // "find information about", "get the price of"
  | 'multi_step_task'      // "login and then search", "purchase this item"
  | 'visual_task'          // "click on the red button", "scroll to the bottom"
  | 'unknown';             // fallback for unclear instructions

export interface InstructionClassification {
  type: InstructionType;
  needsScreenshot: boolean;
  complexity: 'low' | 'medium' | 'high';
  estimatedSteps: number;
  reason: string;
}

export interface ReActStep {
  type: 'thought' | 'action' | 'observation' | 'complete' | 'manualIntervention';
  content: string;
  actionData?: Action;
  timestamp: number;
  // Additional properties for manual intervention
  suggestion?: string;
  category?: string;
  // Classification data when step contains instruction classification
  classificationData?: InstructionClassification;
}

export interface ReActResponse {
  steps: ReActStep[];
  finalAnswer?: string;
  requiresManualIntervention: boolean;
  manualInterventionReason?: string;
  nextAction?: Action;
  isComplete: boolean;
  // Add instruction classification to response
  instructionClassification?: InstructionClassification;
}

export interface ScreenshotAnalysisResult {
  content: string;
  hasCoordinates: boolean;
  length: number;
}

export interface ProcessingOptions {
  maxSteps: number;
  enableVisualAnalysis: boolean;
  screenshotAnalysisTimeout: number;
} 