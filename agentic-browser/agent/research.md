High-Level Implementation Plan: Upgraded LLM Browser Agent Service
Overview
This plan outlines an upgraded AgentService (TypeScript) that accepts natural language instructions and produces tool calls (browser actions) and text responses. The design aligns with AgentOccam principles for web agents, using Playwright for browser automation and the OpenAI API for LLM reasoning. Key improvements include a simplified set of browser actions, a concise page observation format, and a built-in planning mechanism (with branch and prune for sub-tasks). The service will maintain its current interface – it takes free-text instructions and returns a sequence of tool commands and/or final answers – but internally it will be restructured for clarity and robustness.
Action Space Alignment (Minimal Browser Commands)
To make the agent’s actions LLM-friendly, we define a minimal, standardized set of browser commands and remove complex or redundant ones


. This focused action space helps the LLM avoid confusion and misuse of tools

. The core actions include:
goto(URL) – Navigate directly to a URL (for initial pages or known targets). Use sparingly; the agent primarily relies on clicking links, as LLMs poorly remember URL context

.
click(elementId) – Click an element (button, link, etc.) identified by a stable ID or selector.
type(elementId, "text") – Type text into an input field (Playwright’s page.fill or similar).
goBack() – Navigate back in browser history (Playwright’s page.goBack()).
note("message") – Record a note or observation for later use (stores key info in agent memory)

. This is a high-level action the LLM can use to save intermediate results or reminders.
stop("final answer") – Conclude the task, optionally providing a final answer or summary

. This signals the agent is done.
branch("subgoal") – Start a new sub-plan or exploration branch for a subgoal

. Essentially, the LLM uses this to break a complex task into a smaller task.
prune() – Abandon the current plan branch and backtrack to a previous context


. The LLM invokes this after a dead-end or failed approach, enabling it to try an alternate strategy.
Excluded/combined actions: We intentionally omit low-level or ambiguous actions that are hard for LLMs to use reliably

. For example, we do not expose raw mouse movements, key presses, or arbitrary scroll commands. Scrolling is handled implicitly by always loading full page content (preventing aimless scroll loops)

. Similarly, multi-tab operations are simplified – the agent typically works in one page context at a time (if multi-site navigation is needed, a goto or a special goHome action can be used for a known index page)

. By limiting to this essential action set, we ensure each command has a clear, high-level intent that the LLM can learn to use effectively

. These actions will be defined in a TypeScript enum or union type (e.g. BrowserAction = { type: 'click' | 'type' | ...; params: {...} }) for type-safe handling. Playwright Integration: The Tool Dispatcher module (see below) will map each high-level action to Playwright calls: e.g. goto uses browser.newPage().goto(url) or a shared page instance, click(elementId) finds the element (via Playwright’s selectors or stored mapping) and triggers page.click, type uses page.fill with the given text, etc. This ensures the agent’s intent (as decided by the LLM) is executed in the real browser. By keeping the action set small, we reduce the surface for error and make it easier to validate each action before execution (e.g. check that an element ID exists on the page before clicking).
Observation Space Alignment (Refined Page Information)
We introduce an Observation Formatter module to translate the raw web page into a concise, LLM-readable view. Real web pages contain a lot of HTML/CSS noise and repeated boilerplate that can confuse or overwhelm an LLM

. Our strategy is to simplify and structure the page content in a way that preserves essential information while cutting out fluff


:
DOM to Markdown-like Summary: The formatter will parse the page’s DOM (using Playwright’s DOM API or an accessibility tree snapshot) and produce a cleaned representation. For example, static text labels that accompany interactive elements will be merged with those elements so the LLM sees them as one item

. If a link or button has visible text, we represent it as e.g. link [42] "My Account" instead of separate nodes


. Lists and tables are converted into Markdown-style lists/tables

 for brevity – e.g. an HTML table becomes a Markdown table with headers and rows, eliminating repetitive tags like <columnheader> or <gridcell>

. This yields a compact text block that an LLM can easily read, with structure (headers, bullets) intact.
Element IDs for Reference: Every interactive element (links, buttons, inputs) in the observation text gets a unique identifier (e.g. the number in brackets like [42]). These IDs correspond to actual elements on the page (the mapping is stored by the formatter). The LLM will use these IDs in action commands (e.g. click 42) to specify targets. This approach was shown to align well with LLM’s language training


 – the page is described in a simplified textual form with numbered references, making it easier for the model to reason about and refer to page elements.
Filtering and Focus: The observation formatter also filters out extraneous text. Navigational menus, ads, or footer text not relevant to the user’s instruction may be dropped or summarized. We can leverage Playwright to get specific sections (for instance, grabbing all text inside the main content container) or use heuristics to skip repetitive navigation links. By default, however, we include all visible textual content in a compressed form, unless the planning logic (below) restricts it further. The output is a text snippet representing the current page state that’s as small as possible while still answering the task needs

.
Example: If the page has a welcome banner and a table of orders, the formatter might output:
**Home – Orders Page** (Title)  
text: "Welcome, Emma Lopez!"  
**Orders** (table):  
| Order #     | Date     | Total     | Status   | Action         |  
|------------|----------|----------|----------|----------------|  
| 000000191  | 6/21/24  | $8,368.88 | Pending  | **View Order** [46850] |  
This indicates there’s a “View Order” link with ID 46850 in a row of the Orders table


. Unnecessary nodes (e.g. hidden elements, or duplicate text nodes) are removed. The LLM sees a tidy description rather than raw HTML.
Playwright’s Role in Observation: We utilize Playwright to assist in generating this simplified view. For instance, we can call page.content() to get the full HTML and then parse it, or better, use Playwright’s accessible name and role information for each element (via page.accessibility.snapshot() or DOM queries) to identify labels and roles. Playwright’s ability to query elements by text, role, or CSS selectors helps the formatter find relevant content (e.g. all table rows, form labels, etc.) to include. The result is an observation string (or data structure) that the AgentService will feed into the LLM prompt.
Planning and Branching (Task Decomposition)
Complex tasks may require the agent to explore multiple paths or perform steps in different sequences. To handle this, the agent supports tree-structured planning using the branch and prune actions


. We design a Planner (Plan Manager) module to manage this process, while the LLM actually decides when to branch or prune. Key behaviors include:
Branching into Subtasks: When the LLM outputs a branch("subgoal description") action, the Planner creates a new plan node in a tree (with the given description for context). This new branch becomes the active plan. Crucially, the agent isolates the context of each branch: the new subtask will receive the high-level goal and current page observation, but will not automatically include the full interaction history of the previous plan

. This prevents context overflow and keeps the LLM focused on the subtask at hand

. In implementation, we can maintain a stack of plan contexts; pushing a new context on branch will cause the next LLM prompt to omit or minimize earlier unrelated observations. (The interface might expose this as Planner.startSubPlan(description: string)). The Planner also logs the branch relationship (parent-child) so we know where to return after completion.
Pruning (Backtracking): When prune() is called, the Planner interprets it as abandoning the current branch

. It will mark the current sub-plan as finished/failed and pop it from the stack, returning to the parent plan context. This means any intermediate steps or observations from the pruned branch are dropped from the prompt going forward

. The LLM can then try a different approach (perhaps it will branch in a different way or try another action in the parent context). The planner module ensures that after pruning, the agent’s state (browser page or form inputs) is reset as needed to a sane point – possibly by using Playwright’s page.goBack() or caching the page state from before the branch. (In cases where the branch was purely a planning exercise without changing the page, a reset may not be needed.)
Selective History Replay: Whether within a single plan or after branching back, we don’t want to replay the entire history of all steps at each LLM call. Instead, we include only the relevant history – e.g. steps taken in the current branch, or important outcomes from previous branches that matter to the new plan. The Planner works with the Observation Formatter to implement this. One approach is to tag certain pieces of info as “pivotal” when actions occur, meaning they are likely important for later steps

. For instance, if the agent clicks a link to a product page, the text of that link or product name might be marked pivotal. The formatter can then carry over just those pivotal details (and their immediate context) into the next observation, rather than the whole previous page

. This aligns with AgentOccam’s method of remembering only the ancestor, sibling, and descendant nodes of an element the agent interacted with

. In practice, when the LLM performs a click or type, the Planner/formatter could store that element’s info (e.g. “clicked Order 000000191 link”) in a short-term memory. On the next step, this key info is prepended as part of the "Previous interaction" context, but large unrelated parts of the last page are omitted

.
Plan Data Structure: Internally, we can model the plan as a tree of objects, where each node has: a description (goal or step), a reference to parent and list of children, and possibly a record of actions taken in that sub-plan. The Planner module exposes methods such as newBranch(description) -> returns new PlanNode, endBranch() for prune, and maybe completeBranch(result) if a branch finishes successfully (which could be used to propagate a found result back up). This helps organize the agent’s behavior when multiple sub-tasks are in play. The current active plan node is always known, so we know what context to include. When the agent finishes a branch (reaches a stop inside a sub-plan or decides it got what it needed), control returns to the parent node; the parent plan can then use results from the subtask (perhaps via the note action or through variables in code) to continue.
Human Oversight on Planning: Because the agent can branch and explore autonomously, we incorporate a human-in-the-loop checkpoint for safety on sensitive tasks. For example, if a branch involves logging into a user account or performing a high-stakes action (like a purchase or data deletion), the agent should pause and request human approval. Implementation-wise, the Planner could detect keywords or domains (e.g. a goto to a login page, or a form with password fields) and then not proceed automatically. Instead, it could issue a special action or status (like waitForHuman("Please log in to proceed")) – effectively handing control to a human operator for that step. The agent will resume once the human confirms the step is done. This ensures that while the agent plans sub-tasks, it doesn’t execute sensitive operations blindly.
Module Structure and Interfaces
The upgraded AgentService will be organized into clear modules, each with a single responsibility. Below are the main components and their boundaries:
1. AgentService (Coordinator): The main class (AgentService) orchestrates the process. It exposes a method (e.g. executeInstruction(instruction: string)) that takes a free-text user query or command. This module maintains the overall state: current page (or multiple pages if needed), the active plan node, and collected notes. It calls into the other modules as needed: formatting observations, constructing LLM prompts, dispatching actions via Playwright, and looping until completion. It also handles returning results – assembling the final answer or the transcript of tool actions for the caller. The AgentService ensures the interface remains the same as before, so external systems see no difference in how they call it or receive responses (backwards compatibility).
2. ObservationFormatter: A service or class that takes the current browser state (likely a Playwright Page object or DOM snapshot) and produces a textual summary as described in the Observation Alignment section. Its interface could be formatObservation(page: Page, relevantElements?: Set<ElementId>): string. The optional relevantElements parameter is to highlight or include only certain parts (used when selective replay of history is needed). Internally, it uses DOM inspection to merge labels with controls, enumerates interactive elements with IDs, and outputs a Markdown-like string. This module does not need to know anything about the LLM; it only ensures the page info is concise and informative

. We might implement this by traversing the Playwright page’s DOM or using an accessibility tree to list elements with their role and name, then filtering/formatting accordingly.
3. Planner (Plan Manager): This component manages the plan tree and context. It could be part of AgentService or a separate class (PlanManager) that AgentService uses. Its interface includes methods like startPlan(rootGoal: string) to initialize the root objective, branch(subGoal: string) to create a sub-plan (returning a new plan context), prune() to abandon the current plan and revert to parent, and getActivePlan() to get the current plan node. It also might provide getRelevantHistory() which returns a summary of past interactions relevant to the current plan (using the pivot node logic as above). The Planner works closely with the ObservationFormatter: for example, on a branch action, Planner might tell the formatter which prior info to carry over or drop. Essentially, this module encapsulates the workflow management part of the agent’s brain: the tree of objectives and the pruning of failed paths

.
4. Tool Dispatcher (BrowserService + Playwright): This module is responsible for executing the actions decided by the LLM. It wraps the Playwright browser automation. For each tool command (click/type/goto/etc.), it has a handler that calls the appropriate Playwright API. For example:
executeAction({type: 'click', target: id}) will translate the id (as given in the observation text) back to a real element on the page and call page.click(selector) (the mapping from id to selector can be stored by ObservationFormatter, e.g. a dictionary of id -> locator).
executeAction({type: 'type', target: id, text: "hello"}) finds the element and types the provided text.
executeAction({type: 'goto', url}) opens a new page or navigates the current page to the URL.
executeAction({type: 'goBack'}) calls page.goBack().
executeAction({type: 'stop', finalAnswer}) would typically just mark the agent as done (and maybe close the browser or return the answer).
executeAction({type: 'note', content}) doesn’t affect the browser; instead it tells the Planner to save that note (which might later be included in the final answer or used in subsequent steps).
The Tool Dispatcher also catches and handles any exceptions or edge cases (e.g. element not found for a click – it could feed an error back for the LLM to reconsider). Because Playwright is driving a real browser, this module can handle dynamic content: waiting for pages to load, dealing with pop-ups, etc. It will run in an async manner (since Playwright uses async operations), so AgentService orchestrator needs to await these calls.
5. LLM Interface (Prompt Handler): This part manages communication with the OpenAI API (LLM). It’s responsible for building the prompt at each step and parsing the LLM’s response. We will use a consistent prompt format to guide the LLM to produce valid actions. For example, the system prompt can include: “You are a seasoned web navigator agent. Your task is: {user instruction}. You have the following tools: click, type, goto, goBack, note, stop, branch, prune. The page content will be given to you. Respond with reasoning and an action.” – followed by guidelines for output format


. We can adopt a format like AgentOccam, where the LLM’s answer is structured as:
Reasoning: <the agent’s thought process>  
Action: <one of the commands (and parameters) from the allowed list>  


. The Prompt Handler ensures that at each iteration, the prompt sent to the LLM contains: (a) the instruction/task reminder, (b) a summary of relevant previous actions and notes (from Planner), (c) the latest page observation (from ObservationFormatter), and (d) the available actions syntax. It then calls the OpenAI API (e.g. GPT-4) with this prompt and receives a completion. The response is parsed to extract the proposed action (e.g. via regex or by expecting a JSON/structured reply if we use function calling). If the LLM provides a final answer in the stop action or a note, that text is captured for output. Prompt example snippet:
System: You are an autonomous web browsing agent. You can interact with webpages using these commands: click [id], type [id] "text", goto "url", goBack, note "message", branch "subgoal", prune, stop "final answer". Use the page information and history below to decide your next action.
User: Task: "Find the total price of Order #000000191 and provide it."
Context: (Plan: Checking an order) Previous action: clicked "View Order" (id 46850).
Page: You are now on the Order Details page. … (page content in refined format) …
Assistant: Reasoning: The page shows the order details. I need to locate the total price.
Assistant: Action: note "Order 000000191 total is $8,368.88"
In this example, the agent decided to use a note action to record the price. The next step might be to stop with the answer. The Prompt Handler would parse out that the model chose an action note with that content, call the Planner to save it, and then loop again or finalize if appropriate.
6. Human-in-the-Loop Hooks: Although not a separate module, we design interfaces to incorporate human input at critical junctures. For instance, the Tool Dispatcher or AgentService could emit an event or return a specific result if a step needs human action (like “LOGIN_REQUIRED”). The surrounding application (or a human operator interface) can catch this and pause the agent, allow the user to manually log in via the Playwright browser (which can be opened in headed mode), and then resume the agent’s loop. Another approach is to implement a special tool like askUser(prompt) which the LLM can invoke when it knows it shouldn’t or can’t do something autonomously. For example, encountering a CAPTCHA or a payment confirmation might lead the LLM to output stop("I need human assistance to proceed further.") or a predefined humanAssist action. In our plan, we ensure that such hooks exist, so the agent is supervised for sensitive tasks and credentials are never entered by the LLM unless explicitly provided by the user.
LLM Prompting & Few-Shot Strategies
To guide the LLM in using this new interface effectively, we will craft a prompt that clearly explains the action space and observation format. We include in the system message a short description of each action’s syntax and purpose (e.g., “click [id]: click an element with the given id

; type [id] "text": enter text into a field; ...”). We also emphasize the planning actions: “branch "subgoal": if you need to do a sub-task or explore an alternative path, use branch to start a new plan

; prune: if the current path seems wrong or done, go back to the previous plan

.” The prompt will stress that the agent should decide the next best action at each step based on the page content and task goal, and that it can use reasoning (“Thought” or “Reasoning”) before the action. We might include an example in the prompt (a few-shot demonstration) to illustrate the format, especially for the new branch/prune usage and the observation style. For instance, a short dummy task where the agent branches into two plans and prunes one can be shown in the prompt to familiarize the model

. This will help the model not to be confused by the tree-based approach and to use it when appropriate. Since AgentOccam found that even zero-shot GPT-4 could handle this with a good prompt


, we expect with clear instructions our LLM (GPT-4 via OpenAI API) will follow the format. Iterative Prompt Updates: After each tool action execution, the AgentService will update the context (page content changes, or new plan context) and generate a new prompt for the next LLM call. The previous reasoning and action can be summarized in a one-liner (to avoid too much accumulation). If a branch was created, the prompt for the next step will exclude irrelevant old context, as managed by the Planner

. We will also watch token limits: the Observation Formatter’s output is designed to be compact, and by pruning history and using notes, the context remains within the model’s window. If needed, older steps can be truncated or summarized when they are no longer immediately relevant, to save tokens.
Using Playwright for Execution & Simplification
Playwright plays a central role in this service: it executes actions and provides page data for observations. We highlight how it supports our goals:
Action Execution: Playwright’s high-level API allows us to implement each minimal action straightforwardly. We can maintain a single BrowserContext and Page for the agent’s session. For click and type actions, we will likely use element locators. One approach is to have ObservationFormatter assign each element an id and keep a mapping to a Playwright Locator (e.g., using page.locator(selectorString) for that element). Then the Tool Dispatcher can do locators[id].click() or .fill(text) as needed. For goto, we can either navigate the existing page or open a new page if isolating tasks (but in most cases, using one page and goto or clicks should suffice). goBack simply calls Playwright’s navigation history. All of these are inherently supported by Playwright’s robust automation capabilities (clicking handles dynamic waits, etc.), so the agent can interact with real websites seamlessly.
Observation Gathering: Playwright can provide the page’s content in various forms. We plan to use DOM queries (like getting all links, headers, inputs, etc.) and possibly the accessibility tree to identify structure. The accessibility snapshot from Playwright yields a tree of elements with roles and names – which is exactly the kind of data we need to produce the aligned observation


. By processing that snapshot, we can merge redundant nodes (like a link and its duplicate text name) and extract lists/tables efficiently. Playwright can also evaluate scripts in the page to collect text content of specific sections if needed (e.g., we could run a script to return all text in the <main> tag to avoid headers/footers). The ObservationFormatter will utilize these features to build the Markdown view of the page.
Handling Multi-step Interactions: If a sequence of actions triggers navigation or DOM updates, Playwright’s event listeners (like page.on('framenavigated')) can inform our agent service to retrieve a new observation at the right time. We’ll integrate this so that after a click (which often loads a new page or causes a SPA update), we wait for network idle or a DOM change, then call ObservationFormatter for the updated content. This ensures the LLM always works off the latest page state.
In summary, Playwright provides the low-level capabilities to interact with web pages and inspect them. Our AgentService builds on top of that with a structured, minimal interface that the LLM can effectively control

. This layered design (LLM reasoning at a high level, Planner managing context, Formatter summarizing pages, and Playwright executing actions) results in a powerful yet simple architecture for the web agent


.
Maintaining the Instruction Interface (Backward Compatibility)
Crucially, the upgraded AgentService will preserve the external interface of the original class. Callers will still provide a free-text instruction (e.g. “Find the cheapest flight to Paris next month”) and receive either a final answer or a transcript of actions and intermediate notes, as per the existing contract. Under the hood, we have added the planning logic and improved formatting, but this is encapsulated within the service. The class could still be used as const agent = new AgentService(); agent.execute(instruction) and it would handle the rest, returning a result when stop is reached. If the original AgentService streamed tool actions, the new design can also stream actions as they are decided (since the loop produces one action at a time). We ensure all new modules (Planner, Formatter, etc.) are integrated such that they do not break the expected output format. For example, if previously the service emitted a sequence of {action, observation} pairs and then a final answer, it will continue to do so – except the observations will now be cleaner and the action choices more robust. The human-in-loop interventions will be surfaced in a controlled way (possibly as an explicit query to the user or throwing a custom exception that the UI layer handles), which can be added without affecting simpler tasks that don’t require it. By carefully designing module boundaries and interfaces, we make the AgentService extensible and easier to maintain. Each part (LLM prompt logic, planning, browser actions, observation parsing) can be tested or updated independently. The minimal action and observation space, inspired by AgentOccam, should improve the agent’s success rate and efficiency on real-world web tasks


, all while keeping the developer-facing API of our service unchanged.
Conclusion
This implementation plan provides a roadmap for upgrading the AgentService into a more capable browser agent aligned with cutting-edge research. By simplifying the action space to core commands

, streamlining observations into Markdown-like text

, and enabling the LLM to manage its own sub-tasks via branching and pruning

, the agent becomes both easier for the LLM to control and more adept at complex tasks. The use of Playwright ensures we can execute these actions in a real browser context and gather page info reliably. Module separation (ObservationFormatter, Planner, ToolDispatcher, etc.) clarifies the system’s structure and allows future enhancements (for example, swapping in a more advanced LLM or adding learning from feedback) without a full redesign. With this plan, the AgentService will be a robust, testable TypeScript class that bridges natural language instructions and real web interactions, achieving the goals of the AgentOccam architecture in practice. All these improvements occur behind the scenes, so users of the service continue to interact with it in natural language and receive the results they need, now with higher success and clarity. Sources: The design is informed by the AgentOccam approach to minimizing action/observation complexity


 and demonstrates how those principles can be applied using Playwright and modern LLM prompting techniques