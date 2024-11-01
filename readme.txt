=== Simple Tasks & Todo's ===
Contributors: nickvandervreken
Donate link: http://www.famewebdevelopment.com/
Tags: task, tasks, management, manager, todo, list, lists, overlay, simple, easy
Requires at least: 3.0.1
Tested up to: 4.1
Stable tag: 1.2
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

A simple Todo-checklist and task manager, which allows you to create and manage tasks from every page on your website through an overlay view.

== Description ==

Simple Tasks & Todo's displays a very intuitive and handy task manager on top of your existing WordPress website.
The tasks are only displayed when the mouse cursor hovers over the "Task list" icon at the bottom right of your screen, and allow you to easily create and manage task lists and the tasks inside.
Once a task is completed, tick it off and it will be removed from the list and relocated to the "Completed tasks". This will give you a clear overview of the tasks at hand, and allow you to bring completed tasks on the screen with a simple click.

**Features:**

* Quick overview of tasks on every page
* Does not annoy the user or clutter your browser window unnecessarily
* Task list support
* Pending, completed and cancelled tasks
* Re-order tasks in a task list
* Only visible for selected users

**Pro features (Pro version in development)**

* Assign tasks to users
* Task dependencies (task depends on completion of another selected task)
* Colour-code tasks and task lists
* Keep time spent per task, and generate a report of total time spent broken down on task or task list level
* Urgent tasks
* Comment on tasks
* Additional colour schemes and layout types

== Installation ==

1. Upload the directory `wp_simple_task_manager` to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure user permissions under 'Settings' > 'Simple Tasks & Todo's'

== Frequently Asked Questions ==

= Will Simple Tasks & Todo's always be free? =

Yes, we will always have a free version available with (at least) the functionality available in this plugin.
Additional functionality will be available in the Pro-version of our plugin, which is available at a very reasonable price.

= Can I download translations of Simple Tasks & Todo's in my language? =

We're still working on that, but you will be at some point.
At present our time is going into developing additional features, so unfortunately we cannot give an accurate timestamp on availability of other languages.

= I have a need for a functionality not included in the free or Pro version. Is there any way this can be developed? =

Most certainly. Send us a message outlining the functionality you desire, and we'll see if it is something we can add to either our free or Pro version of the plugin at no additional charge.
If it is a functionality that is quite specific to your needs and would not bring any added value to most of our users, we might have to charge you for the extra work.

= Can I use the Pro-version of Simple Tasks & Todo's on multiple websites? =

Yes, as long as all websites are under your management or ownership.
You are not allowed to redistribute or sell the plugin as part of a package or service without our consent.

== Screenshots ==

1. Tasks and Todo's will be displayed on top of your website or WordPress admin, with task list tabs at the bottom of your screen when activated. Type in a new task description and press Enter to add that task to the list.
2. When viewing the website or working on the back-end, the task lists will be hidden from view. They will become visible when you move your cursor over the Task list tab at the bottom of the screen.
3. Completed tasks can easily be displayed by pressing the "x tasks completed" button. Clicking the button again will hide them from view.
4. Easily edit the task list label or delete the task list by clicking the edit (pencil) button next to the task title.
5. New tasks lists can easily be created by pressing the "+" button on the left of the task list tabs.
6. Tasks and Todo's will be displayed on top of the front-end (actual website) and in the WordPress admin, only for users who you give permission to manage these tasks.

== Changelog ==

= 1.1.2 =
* Bug fix for notices sent before the headers were outputted. Happened on server with notice warnings on.

= 1.1.1 =
* Now displaying WordPress $wpdb class errors when a database error occurs.

= 1.1 =
* Bug fixes; window overlay background in WordPress admin and incorrect escaping of ' and " characters.

= 1.0 =
Initial version of the free Simple Tasks & Todo's plugin.

= 0.9 =
* Bug fixes
* Cross-browser style fixes