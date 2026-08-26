Ciian - Setup
- index page has ciian welcome page with setup button
- setup page to set .env variables
- variables to be setted
- app url
- db type
- db host
- db port
- db name
- db password
- creation of root user
- error handling

Ciian - Database Engine
- table schema saving (`unpub_shape`) on ciian_int_tbl / ciian_sys_tbl
- Ciian + No System → ciian_int_tbl (tags ciian / no_system); real systems → ciian_sys_tbl
- table publish creates physical DDL (with FK constraints) and stores `pub_shape`
- publish also generates Eloquent models + belongsTo/hasMany from foreignId columns
- republish syncs physical DDL from `unpub_shape` when it differs from `pub_shape` (add/change/drop columns), then regenerates the model
- hand-written platform models are not overwritten; #[Fillable], @property docs, and belongsTo methods merge on republish (Hidden stays out of Fillable); parent hasMany is updated on generated parents
- table delete drops physical table (when published), removes generated model, and blocks if other tables reference it
- protected platform tables require root password confirmation to delete or republish
- table schema modifying (edit unpub_shape; publish/republish applies DDL)
- platform Accounts shapes (users / roles / permissions) stored in ciian_int_tbl
- Tables module (/tables) for managing those shapes
- error handling

Ciian - MVC Engine
- mvc shape saving
- mvc modifying
- error handling

Ciian - Components
- reusable building blocks

Ciian - System Builder
- display
- controls
- permissions

Ciian - System Builder Engine
- system shape saving
- system created permissions saving
- system used components shape saving


data = database table
shape = json = longtext


Ciian - Notables
*hidden forgot password button for now - configure mailer later
*2FA hidden for now - configure later
*Passkeys hidden for now - configure later