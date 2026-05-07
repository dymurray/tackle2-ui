The goal is to continue the enablement of running agentic migrations in the application inventory. On this branch, we added a view "Migrators" in the administration panel. On the application inventory, clicking "Migrate" button opens a popup that allows a user to select which migrator to use. This then creates the task with the details from the migrator for the addon task to use. We want to make changes to the following areas:

# Migrators view in admin panel

1. Rename "Migrators" to "Agents"
2. Change the model of the Migrator (now Agent) to contain the following information:

- Name
- Description
- Pallet configuration
- Model configuration - This should contain provider_type, provider URL, model name, etc. Make this optional for now

# New view "Agent Plans"

1. Add a new view to the administration dashboard "Agent Plans"
2. Agent Plans should just be a list of plan entities that is markdown. We should allow a user to copy paste markdown into a form and save it, edit it, or delete it
3. Follow same behavior as the Agent/Migrator logic today, I believe its stored in local storage that is fine for now
4. Every plan should have a name

# Modify "Migrate" pop up wizard

1. When clicking "Migrate" in the application inventory, I should be able to select an agent and a plan to execute. This should be 2 drop down menus allowing me to select each
2. This should create a task as it does today with all of this data in JSON
