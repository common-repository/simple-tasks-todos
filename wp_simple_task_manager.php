<?php
/**
 * Plugin Name: Simple Tasks & Todo's
 * Plugin URI: http://www.famewebdevelopment.com
 * Description: A simple Todo-list and task manager for WordPress, available on every page as an overlay on top of your website. Create and manage tasks, task lists and ToDo's quickly from any page on your site, both admin and front-end. Only grant specified users access to the task lists.
 * Version: 1.0
 * Author: Nick Van der Vreken
 * Author URI: http://www.famewebdevelopment.com
 * License: GPL2
 */

// Database version
global $ftm_db_version;
$ftm_db_version = '1.3';


function ftm_handler(){
    global $wpdb;
    ob_start();
    $vars = $_REQUEST;
    $action = array_key_exists('a', $vars) ? $vars['a'] : false;

    switch($action){
        // Saves a task.
        // Not all fields are to be given for an update.
        case 'save-task':
            $result = ftm_save_task($vars);
            if(is_numeric($result)){
                $data['result'] = $result;
                $data['task'] = ftm_get_task($result);

                // Return amount of active and completed tasks in list on status update.
                $tlid = (int)$vars['tlid'] ?: ((int)$vars['tid'] ? $wpdb->get_var("SELECT tlid FROM {$wpdb->prefix}ftm_tasks WHERE tid = ".(int)$vars['tid']) : false);
                if($tlid){
                    $status_counts = $wpdb->get_results("SELECT status, COUNT(tid) AS num_tasks FROM {$wpdb->prefix}ftm_tasks WHERE tlid = $tlid GROUP BY status", OBJECT_K);
                    $data['tlid_status_count'] = array('active' => $status_counts[1] ? $status_counts[1]->num_tasks : 0, 'completed' => $status_counts[2] ? $status_counts[2]->num_tasks : 0);
                }
            }
            else $data['errors'][] = $result;

            break;

        case 'delete-task':
            $tlid = (int)$wpdb->get_var("SELECT tlid FROM {$wpdb->prefix}ftm_tasks WHERE tid = ".(int)$vars['tid']);
            $data['result'] = ftm_delete_task($vars['tid']);

            // Return amount of active and completed tasks in list on status update.
            if($tlid){
                $status_counts = $wpdb->get_results("SELECT status, COUNT(tid) AS num_tasks FROM {$wpdb->prefix}ftm_tasks WHERE tlid = $tlid GROUP BY status", OBJECT_K);
                $data['tlid_status_count'] = array('active' => $status_counts[1] ? $status_counts[1]->num_tasks : 0, 'completed' => $status_counts[2] ? $status_counts[2]->num_tasks : 0);
            }
            break;

        case 'get-tasks':
            $data['result'] = array_values(ftm_get_tasks($vars));
            break;

        case 'init':
            $tasks = ftm_get_tasks(array('status' => 1, 'group_by_list' => 1));
            $data['result'] = array(
                'settings' => array(),
                'lists' => array_values(ftm_get_task_lists())
            );

            foreach($data['result']['lists'] as $k => $l){
                $data['result']['lists'][$k]->tasks = array_values(is_array($tasks[$l->tlid]) ? $tasks[$l->tlid] : array());
            }

            //$data['tasks'] = $tasks;

            break;


        /**
         * Task lists
         */
        case 'new-task-list':
            $result = ftm_save_task_list($vars);
            if(is_numeric($result)) $data['result'] = $result;
            else $data['errors'][] = $result;
            break;

        case 'save-task-list':
            $result = ftm_save_task_list($vars);
            if(is_numeric($result)){
                $data['result'] = $result;
                $data['task_list'] = ftm_get_task_list($result);
            }
            else $data['errors'][] = $result;

            break;

        case 'delete-task-list':
            $data['result'] = ftm_delete_task_list($vars['tlid']);
            break;


        case 'task-order':
            if(is_array($vars['order'])) foreach($vars['order'] as $k => $tid){
                $wpdb->query($wpdb->prepare("UPDATE {$wpdb->prefix}ftm_tasks SET weight = %d WHERE tid = %d", (int)$k, (int)$tid));
            }
            $data['result'] = true;
            break;


        default:
            $data['errors'][] = 'Invalid ftm_action';
    }

    //mail('nick@wasteplan.co.za', 'Backstreet API', var_export($data, true)."\n\n-----------------\n\n".var_export($vars, true));

    ftm_return($data);
}

/**
 * Creates or updates a task object.
 * @param $task
 * @return String || Integer
 */
function ftm_save_task($task){
    global $wpdb;
    if(is_array($task)) $task = (object)$task;
    if(!is_object($task)) return 'Invalid task object';

    $fields = array('weight' => (int)$task->weight, 'label' => $task->label, 'status' => isset($task->status) ? (int)$task->status : 1,
                        'tlid' => (int)$task->tlid);
    $field_types = array('%d', '%s', '%d', '%d');

    // Update
    if($task->tid && is_numeric($task->tid) && $ori_task = ftm_get_task($task->tid)){
        $i = 0;
        foreach($fields as $k => $v){
            if(!isset($task->{$k})) unset($fields[$k], $field_types[$i]);
            $i++;
        }

        $updated = $wpdb->update($wpdb->prefix.'ftm_tasks', $fields, array('tid' => $task->tid), $field_types, array('%d'));
        return $updated === false ? 'An error occured while updating the task. '.$wpdb->last_error : $task->tid;
    }

    // Insert
    else{
        $fields['author'] = get_current_user_id();
        $fields['created'] = time();
        $field_types[] = '%d';
        $field_types[] = '%d';
        $tid = $wpdb->insert($wpdb->prefix.'ftm_tasks', $fields, $field_types);
        return $tid ? $wpdb->insert_id : 'An error occured while creating the task. '.$wpdb->last_error;
    }
}


/**
 * Deletes a task from the system.
 * @param $task
 * @return bool
 */
function ftm_delete_task($task){
    global $wpdb;
    $tid = is_numeric($task) ? $task : (is_object($task) ? $task->tid : (is_array($task) ? $task['tid'] : false));
    return $tid === false ? false : !!($wpdb->delete($wpdb->prefix.'ftm_tasks', array('tid' => $tid), array('%d')));
}


/**
 * Retrieves an array of task objects, keyed by the task ID.
 * @param $args
 * @return array
 */
function ftm_get_tasks($args=NULL){
    global $wpdb;
    if(!is_array($args)) $args = array();

    // Build SQL
    $where = array();
    if(array_key_exists('status', $args) && is_numeric($args['status'])) $where['status'] = "t.status = $args[status]";
    if(array_key_exists('tlid', $args) && is_numeric($args['tlid'])) $where['tlid'] = "t.tlid = $args[tlid]";
    if(array_key_exists('tid', $args) && is_numeric($args['tid'])) $where['tid'] = "t.tid = $args[tid]";

    $where = empty($where) ? '' : 'WHERE '.implode(' AND ', $where);

    $sql = "SELECT t.tid, t.*, a.display_name AS author_label
                FROM {$wpdb->prefix}ftm_tasks t
                LEFT JOIN $wpdb->users a ON t.author = a.ID
                $where
                ORDER BY t.weight ASC";

    //exit($sql);

    // Fetch data
    $tasks = $wpdb->get_results($sql, OBJECT_K);

    // Process data

    if($args['group_by_list']){
        $grouped_tasks = array();
        foreach($tasks as $tid => $t) $grouped_tasks[$t->tlid][$tid] = $t;
        $tasks = $grouped_tasks;
    }

    return $tasks;
}

/**
 * Retrieves a task object.
 * @param $task_id
 * @return bool
 */
function ftm_get_task($task_id){
    if(!is_numeric($task_id) || !$task_id) return false;
    $task = ftm_get_tasks(array('tid' => $task_id));
    return $task[$task_id] ?: false;
}




/**
 * Creates or updates a task list.
 * @param $task
 * @return String || Integer
 */
function ftm_save_task_list($task_list){
    global $wpdb;
    if(is_array($task_list)) $task_list = (object)$task_list;
    if(!is_object($task_list)) return 'Invalid task list object';

    $fields = array('weight' => (int)$task_list->weight, 'label' => $task_list->label);
    $field_types = array('%d', '%s');

    // Update
    if($task_list->tlid && is_numeric($task_list->tlid) && $ori_task_list = ftm_get_task_list($task_list->tlid)){
        $updated = $wpdb->update($wpdb->prefix.'ftm_task_lists', $fields, array('tlid' => $task_list->tlid), $field_types, array('%d'));
        return $updated === false ? 'An error occured while updating the task list. '.$wpdb->last_error : $task_list->tlid;
    }

    // Insert
    else{
        $tlid = $wpdb->insert($wpdb->prefix.'ftm_task_lists', $fields, $field_types);
        return $tlid ? $wpdb->insert_id : 'An error occured while inserting the task list. '.$wpdb->last_error;
    }
}


/**
 * Deletes a task list from the system.
 * @param $task_list
 * @return bool
 */
function ftm_delete_task_list($task_list){
    global $wpdb;
    $tlid = is_numeric($task_list) ? $task_list : (is_object($task_list) ? $task_list->tlid : (is_array($task_list) ? $task_list['tlid'] : false));
    return $tlid === false ? false : !!($wpdb->delete($wpdb->prefix.'ftm_task_lists', array('tlid' => $tlid), array('%d')));
}


/**
 * Retrieves an array of task list objects, keyed by the task ID.
 * @param $args
 * @return array
 */
function ftm_get_task_lists($args=NULL){
    global $wpdb;
    if(!is_array($args)) $args = array();

    // Build SQL
    $sql = "SELECT tl.tlid, tl.*
                FROM {$wpdb->prefix}ftm_task_lists tl
                ORDER BY tl.weight ASC";

    // Fetch data
    $task_lists = $wpdb->get_results($sql, OBJECT_K);

    // Process data
    foreach($task_lists as $tlid => $tl){
        $task_lists[$tlid]->active_tasks = 0;
        $task_lists[$tlid]->completed_tasks = 0;
    }

    $sql = "SELECT tid, tlid, status FROM {$wpdb->prefix}ftm_tasks";
    $tasks = $wpdb->get_results($sql, OBJECT_K);
    foreach($tasks as $t){
        if($task_lists[$t->tlid] && ($t->status == 1 || $t->status == 2)) $task_lists[$t->tlid]->{$t->status == 1 ? 'active_tasks' : 'completed_tasks'}++;
    }

    return $task_lists;
}

/**
 * Retrieves a task list object.
 * @param $task_list_id
 * @return bool
 */
function ftm_get_task_list($task_list_id){
    if(!is_numeric($task_list_id) || !$task_list_id) return false;
    $task_list = ftm_get_task_lists(array('tlid' => $task_list_id));
    return $task_list[$task_list_id] ?: false;
}


/**
 * Returns the data to the client.
 * @param $data
 */
function ftm_return($data){
    ob_end_clean();
    header('Content-Type: application/json');
    if(isset($_REQUEST['cbkey'])) $data['cbkey'] = $_REQUEST['cbkey'];

    //mail('nick@wasteplan.co.za', 'Backstreet API Exit', var_export($data, true));
    exit(json_encode($data));
}



/**
 * Installation; creating the database.
 */

function ftm_install() {
    global $wpdb;
    global $ftm_db_version;

    $charset_collate = $wpdb->get_charset_collate();

    $sql_tasks = "CREATE TABLE {$wpdb->prefix}ftm_tasks (
		tid mediumint(9) NOT NULL AUTO_INCREMENT,
		tlid INT(9) NOT NULL,
		created INT(9) DEFAULT 0 NOT NULL,
		author INT,
		label VARCHAR(255) DEFAULT 'New task' NOT NULL,
		status INT,
		description TEXT DEFAULT NULL,
		weight INT DEFAULT 0,
		UNIQUE KEY tid (tid)
	) $charset_collate;";

    $sql_task_lists = "CREATE TABLE {$wpdb->prefix}ftm_task_lists (
		tlid mediumint(9) NOT NULL AUTO_INCREMENT,
		label VARCHAR(255) DEFAULT 'New task list' NOT NULL,
		weight INT DEFAULT 0,
		UNIQUE KEY tlid (tlid)
	) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql_tasks);
    dbDelta($sql_task_lists);

    add_option('ftm_db_version', $ftm_db_version);
    add_option('ftm_plugin_options', array('permissions' => array(get_current_user_id() => get_current_user_id())));
}
register_activation_hook(__FILE__, 'ftm_install');


/**
 * AJAX communication.
 */
add_action('wp_ajax_ftm', 'ftm_handler');
add_action('wp_ajax_nopriv_ftm', 'ftm_handler');


/**
 * Enqueue scripts and styles
 */
function ftm_scripts() {
    $settings = get_option('ftm_plugin_options');
    if(is_array($settings) && is_array($settings['permissions']) && $settings['permissions'][get_current_user_id()]){
        wp_enqueue_style('ftm_style', plugins_url('/style.css', __FILE__));
        wp_enqueue_script('ftm_layout_hoverintent', plugins_url('/js/jquery.hoverintent.js', __FILE__ ), array('jquery-ui-sortable'));
        //wp_enqueue_script('ftm_layout_modal', plugins_url('/js/modalWindows.js', __FILE__ ), array('ftm_layout_hoverintent'));
        wp_enqueue_script('ftm_layout', plugins_url('/todo.js', __FILE__ ), array('ftm_layout_hoverintent'));
    }
}
add_action('wp_enqueue_scripts', 'ftm_scripts');
add_action('admin_enqueue_scripts', 'ftm_scripts');


/**
 * Options page
 * http://ottopress.com/2009/wordpress-settings-api-tutorial/
 */
add_action('admin_menu', 'ftm_settings');
function ftm_settings(){add_options_page('Simple Tasks &amp; Todo\'s', 'Simple Tasks &amp; Todo\'s', 'manage_options', 'ftm', 'ftm_settings_page');}
function ftm_settings_page(){

    //Check the users permission level
    if(!current_user_can('manage_options')) wp_die( __('You do not have sufficient permissions to access this page.') );

    echo '<div><h2>Simple Tasks &amp; Todo\'s</h2><form action="options.php" method="post">';
    settings_fields('ftm_plugin_options');
    do_settings_sections(__FILE__);
    echo '<input name="Submit" type="submit" value="';
    esc_attr_e('Save Changes');
    echo '" /></form></div>';
}

add_action('admin_init', 'ftm_register_plugin_options');
function ftm_register_plugin_options(){

    // Create the main setting group: 'wsuy-theme-options'
    register_setting('ftm_plugin_options', 'ftm_plugin_options', 'ftm_plugin_options_validate');

    /* Add a settings group sub-section: 'wsuy-theme-options-section'
     * Function Definition:
     * add_settings_section(unique text id,  displayed title, function to display, callback page)
     */
    add_settings_section('ftm_plugin_options_section', 'User permissions', 'ftm_plugin_options_section_description', __FILE__);

    /* Define theme options fields:
     * Function Definition:
     * add_settings_field(unique  id, displayed title, display, callback page, section id)
     */
    add_settings_field('ftm_permissions', 'Enable tasks for', 'ftm_permissions_html', __FILE__, 'ftm_plugin_options_section');
}

// Todo; add pro link here.
function ftm_plugin_options_section_description(){echo '<p>Select the users you want to allow access to the task lists.<br />All selected users will have full access.</p>';}

// Actual user select form HTML
function ftm_permissions_html(){
    $available_accounts = get_users('orderby=nicename');
    $settings = get_option('ftm_plugin_options');
    $permissions = is_array($settings) && is_array($settings['permissions']) ? $settings['permissions'] : array();

    foreach($available_accounts as $user){
        echo '<p><label><input type="checkbox" name="ftm_plugin_options[ftm_permissions][user_'.$user->ID.']" value="'.$user->ID.'" '.($permissions[$user->ID] ? ' checked="checked"' : '').' /> '.esc_html($user->data->display_name).'</label></p>';
    }
}

function ftm_plugin_options_validate($input){
    $settings = get_option('ftm_plugin_options');
    if(!is_array($settings)) $settings = array();
    $settings['permissions'] = array();
    if(is_array($input['ftm_permissions'])) foreach($input['ftm_permissions'] as $k => $v){
        $k = str_replace('user_', '', $k);
        if(is_numeric($k)) $settings['permissions'][$k] = $k;
    }
    return $settings;
}