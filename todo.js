/**
 * Created by Nick on 12/16/14.
 */
(function($){
    $.fn.ftm = function(action, args){
        if(!isObject(args)) args = {};

        // Make sure DOM is there
        var $ftm = $('#ftm'), $ftmh, $ftmc;
        if(!$ftm.length){
            var $body = $('body');
            $ftm = $('<div id="ftm"><a class="ftm-handle">Task list</a><div class="ftm-content"><span class="ftm-still-loading">Loading tasks lists...</span></div></div>').appendTo($body);
            $ftmh = $ftm.find('.ftm-handle');
            $ftmc = $ftm.find('.ftm-content');

            $ftm.hoverIntent(function(){
                if($ftm.removeClass('can-close').hasClass('showing')) return;
                $ftmh.animate({bottom:'-30px'}, 300);
                $ftmc.animate({bottom:'0px'}, 300);
                $ftm.addClass('showing');
            }, function(){
                if($ftm.find('.ftm-task-list.showing').length) return;
                $ftm.addClass('can-close');
                $ftm.data('lastBlur', (new Date()).getTime());
                setTimeout(function(){
                    if(!$ftm.hasClass('can-close')) return;
                    $ftmh.animate({bottom:'0px'}, 300);
                    $ftmc.animate({bottom:($ftmc.height()+50)*-1 + 'px'}, 300);
                    $ftm.removeClass('showing can-close');
                }, 3000);
            });

            return $body.ftm('init');
        }
        else{
            $ftmh = $ftm.find('.ftm-handle');
            $ftmc = $ftm.find('.ftm-content');
        }

        // Other variables
        var $h = args.handle ? $(args.handle) : false,
            $li = $h ? $h.closest('li') : false,
            $tl = $h ? $h.closest('.ftm-task-list') : false,
            mw, k, v, i, j, t, $ul, $input, label, tid, tlid;


        switch(action){

        /**
         * Initializes the task lists
         */
            case 'init':
                ftmCall('init', false, function(result){
                    if(isObject(result) && isObject(result.result)){
                        var l, tasks;
                        result = result.result;
                        $ftmc.html('');

                        for(l in result.lists){
                            v = result.lists[l];
                            v.label = String(v.label).replace(/\\/g, '');

                            tasks = '';
                            if(isObject(v.tasks)){
                                for(k in v.tasks){
                                    t = v.tasks[k];
                                    t.label = String(t.label).replace(/\\/g, '');
                                    __ftmStorage[t.tid] = t;
                                    tasks += '<li data-tid="' + t.tid + '" class="ftm-task status-1 tid-' + t.tid + '"><input class="ftm-chk-status" type="checkbox" onchange="ftm(\'status-change\', {handle:this, tid:' + t.tid + '});" /><a onclick="ftm(\'task-details\', {handle:this});">' + t.label + '</a></li>';
                                }
                            }

                            $ftmc.append('<div class="ftm-task-list  tlid-' + v.tlid + '" data-tlid="' + v.tlid + '">' +
                                '<a class="ftm-task-list-handle" onclick="ftm(\'show-task-list\', {handle:this});"><span class="label">' + v.label + '</span> <span class="active-count">' + v.active_tasks + '</span></a>' +
                                '<div class="ftm-task-list-content"><span class="ftm-task-list-title"><span class="label">' + v.label + '</span><a onclick="ftm(\'edit-task-list\', {handle:this});"></a></span>' +
                                    '<div class="scroll"><div class="scroll-inner">' +
                                        '<ul>' + tasks + '</ul>' +
                                        '<a class="ftm-task-list-completed" onclick="ftm(\'toggle-completed\', {handle:this});"><span>' + v.completed_tasks + '</span> tasks completed</a>' +
                                        '<div class="ftm-new-task-container">' +
                                            '<p class="ftm-new-task-creating">Creating task...</p>' +
                                            '<p class="ftm-new-task-error">Could not create task</p>' +
                                            '<input class="ftm-new-task-input" type="text" placeholder="Enter new task and press Enter" onkeypress="if(event.keyCode == 13) ftm(\'new-task\', {tlid:' + v.tlid + ', input:this});"/>' +
                                        '</div>' +
                                    '</div></div>' +
                                '</div></div>');
                        }

                        $ftmc.find('ul').sortable({
                            placeholder: "ui-state-highlight",
                            forcePlaceholderSize: true,
                            update: function(event, ui){
                                var $li = $(ui.item), $ul = $li.closest('ul'), tlid = $li.closest('.ftm-task-list').data('tlid'), order = [];
                                if(!$ul.length || !tlid || !isNumeric(tlid)) return false;
                                $ul.children('li').each(function(){order.push($(this).data('tid'))});
                                ftmCall('task-order', {order:order});

                                __ftmTimestamp = (new Date()).getTime();
                            }
                        });

                        $ftmc.append('<a class="ftm-new-task-list" onclick="ftm(\'new-task-list\');">+</a>');
                        $ftmc.append('<span id="ftm-list-nav"><a class="prev" onclick="ftm(\'prev-list\');">&laquo;</a> <a class="next" onclick="ftm(\'next-list\');">&raquo;</a></span>')
                    }
                    else $ftmc.html('Error loading task list');

                    var width = 0;
                    $ftmc.children().each(function(){width += $(this).width() + 30;});
                    $ftmc.width(width);

                    ftmRecalculateScroll();
                    ftmRecalculateNav();
                });

                if(args.modal) args.modal.close();

                // Window resize
                $(window).resize(ftmRecalculateScroll).resize(ftmRecalculateNav);
                break;


        /**
         * Creates a new task list.
         * Launches a modal window, prompting the user to enter the task list name.
         */
            case 'new-task-list':
                mw = new ftmModalWindow({title:'Create new task list', class:'ftm-new-task-list-popup',
                    content:'<input id="ftm-new-task-list-label" type="text" placeholder="Type the name of the new task list" onkeypress="if(event.keyCode == 13) __currentModalWindow.submit();" />',
                    submitLabel:'Create task list', width:400}).open();

                mw.setValidate(function(){
                    var isOK = String(mw.find('#ftm-new-task-list-label').val()).length > 4;
                    if(isOK) ftmRemoveMessage('error'); else ftmError('Please enter at least 5 characters.');
                    return isOK;
                });
                mw.setCallback(function(){
                    var v = String(mw.find('#ftm-new-task-list-label').val());
                    ftmLoading('Creating task list...');
                    ftmCall('new-task-list', {label:v}, function(conf){
                        if(isObject(conf) && conf.result){
                            ftmSuccess('Task list created, re-initializing...', true);
                            ftm('init', {modal:mw});
                        }
                        else ftmWebError(conf, 'An error occured while creating the new task list.', true);
                    });
                    return false;
                });
                break;


        /**
         * Creates a new task.
         *
         */
            case 'new-task':
                $input = $(args.input);
                label = String($input.val());
                $tl = $input.closest('.ftm-task-list');
                $ul = $tl.find('ul');

                if(label.length < 3) return this;
                $tl.addClass('creating-task');
                ftmCall('save-task', {tlid:$tl.data('tlid'), label:label}, function(conf){
                    $tl.removeClass('creating-task');
                    $input.val('');
                    if(isObject(conf) && isNumeric(conf.result)){
                        $ul.append('<li data-tid="' + conf.result + '" class="ftm-task status-1 tid-' + conf.result + '"><input class="ftm-chk-status" type="checkbox" onchange="ftm(\'status-change\', {handle:this});" /><a onclick="ftm(\'task-details\', {handle:this});">' + label + '</a></li>');
                        if(isObject(conf.task)) __ftmStorage[conf.result] = conf.task;
                        if(conf.tlid_status_count){
                            $tl.find('.active-count').text(conf.tlid_status_count.active);
                            $tl.find('.ftm-task-list-completed span').text(conf.tlid_status_count.completed);
                        }
                        ftmRecalculateScroll();
                    }
                    else{
                        $tl.addClass('error-creating-task');
                        setTimeout(function(){$tl.removeClass('error-creating-task');}, 2000);
                    }
                });
                break;


        /**
         * Opens up a task list.
         */
            case 'show-task-list':
                if($tl.hasClass('showing')) $tl.removeClass('showing');
                else{
                    $ftm.find('.ftm-task-list.showing').removeClass('showing');
                    $tl.addClass('showing');
                    if($tl.offset().left + 320 > $(window).width()) $tl.addClass('x-offset-fix');
                    else $tl.removeClass('x-offset-fix');
                }
                break;


        /**
         * Edits a task list
         */
            case 'edit-task-list':
                // Hide any open task list or open modal window
                $ftm.find('.ftm-task-list.showing').removeClass('showing');
                if(__currentModalWindow) __currentModalWindow.close();

                tlid = $tl.data('tlid');
                label = $h.parent().text();
                mw = new ftmModalWindow({title:label, width:400}).open();
                mw.setContent('<div class="ftm-form-item task-list-label edit"><label for="ftm-edit-task-list-label">Task list label:</label><input type="text" placeholder="Enter the new task list label" id="ftm-edit-task-list-label" onkeypress="if(event.keyCode == 13) __currentModalWindow.submit();" /></div>');
                $input = mw.find('input').val(label);
                mw.find('.ftm-modal-buttons').prepend('<a class="ftm-button ftm-delete-task" onclick="ftm(\'delete-task-list\', {tlid:' + tlid + ', handle:this});">Delete task list</a>');

                mw.setValidate(function(){
                    var isOK = String($input.val()).length > 4;
                    if(isOK) ftmRemoveMessage('error'); else ftmError('Please enter at least 5 characters.');
                    return isOK;
                })
                    .setCallback(function(){
                        var v = String($input.val());
                        ftmLoading('Saving changes...');
                        mw.hideButtons();
                        ftmCall('save-task-list', {tlid:tlid, label:v}, function(conf){
                            if(isObject(conf) && conf.result){
                                ftmSuccess('Your changes were saved succesfully.', true);
                                setTimeout(function(){mw.close();}, 1500);
                                $tl.find('.ftm-task-list-title .label').text(v);
                                $tl.find('.ftm-task-list-handle .label').text(v);
                                ftmRecalculateNav();
                            }
                            else ftmWebError(conf, 'An error occured while saving your changes.<br />The changes might not have been saved.');
                            mw.showCancel().setCancelLabel('Close');
                        });
                        return false;
                    }).showSubmit().setSubmitLabel('Save changes');
                break;


        /**
         * Opens a popup showing the task details.
         */
            case 'task-details':
                // Cancel if the click was the result of a sortable event
                if(__ftmTimestamp > (new Date()).getTime() - 1000) return false;

                tid = $li.data('tid');
                task = __ftmStorage[tid];
                task.label = task.label.replace(/\\/g, '');

                // Hide any open task list or open modal window
                $ftm.find('.ftm-task-list.showing').removeClass('showing');
                if(__currentModalWindow) __currentModalWindow.close();

                if(isObject(task)){
                    mw = new ftmModalWindow({title:task.label, class:'task-details-popup', width:Math.min(600, $(window).width() - 100),
                        content:'<div class="ftm-form-item task-label"><label for="ftm-task-label">Task label:</label><div class="value">' + task.label + '<a class="ftm-inline-edit-handle" onclick="ftm(\'edit-task\', {handle:this, tid:' + tid + '});"></a></div></div>'
                    }).open().hideSubmit();
                    mw.find('.ftm-modal-buttons').prepend('<a class="ftm-button ftm-delete-task" onclick="ftm(\'delete-task\', {tid:' + tid + ', handle:this});">Delete task</a>');
                }
                else ftmError('The task details could not be retrieved.');
                break;


        /**
         * Edit task
         * Changes the label display in the popup into an input box, and handles submissal.
         */
            case 'edit-task':
                mw = __currentModalWindow;
                task = __ftmStorage[args.tid];
                task.label = task.label.replace(/\\/g, '');

                if(!mw) return alert('FTM could not connect to open modal window.');
                if(!isObject(task)) return ftmError('The task details could not be retrieved.');

                mw.find('.ftm-form-item.task-label').append('<input type="text" placeholder="Enter the new task label" id="ftm-task-label" onkeypress="if(event.keyCode == 13) __currentModalWindow.submit();" />').addClass('edit').find('div.value').hide();
                mw.find('#ftm-task-label').val(task.label);
                mw.find('.ftm-delete-task').remove();

                mw.setValidate(function(){
                    var isOK = String(mw.find('#ftm-task-label').val()).length > 4;
                    if(isOK) ftmRemoveMessage('error'); else ftmError('Please enter at least 5 characters.');
                    return isOK;
                })
                .setCallback(function(){
                    var v = String(mw.find('#ftm-task-label').val());
                    ftmLoading('Saving changes...');
                    mw.hideButtons();
                    ftmCall('save-task', {tid:task.tid, label:v}, function(conf){
                        if(isObject(conf) && conf.result){
                            ftmSuccess('Your changes were saved succesfully.', true);
                            setTimeout(function(){mw.close();}, 1500);

                            $li = $ftm.find('li.tid-' + task.tid);
                            $tl = $li.closest('.ftm-task-list');
                            if(conf.task) __ftmStorage[task.tid] = conf.task;
                            if(conf.tlid_status_count){
                                $tl.find('.active-count').text(conf.tlid_status_count.active);
                                $tl.find('.ftm-task-list-completed span').text(conf.tlid_status_count.completed);
                            }
                            $li.find('a').text(v);
                        }
                        else ftmWebError(conf, 'An error occured while saving your changes.<br />The changes might not have been saved.');
                        mw.showCancel().setCancelLabel('Close');
                    });
                    return false;
                }).showSubmit().setSubmitLabel('Save changes');
                break;


        /**
         * Deletes a task.
         */
            case 'delete-task':
                if(__currentModalWindow) __currentModalWindow.close();
                mw = new ftmModalWindow({title:'Confirm task deletion', content:'Are you sure you wish to delete this task?<br />All data associated with this task will be removed as well.', cancelLabel:'No, don\'t delete', submitLabel:'Yes, delete this task', width:400}).open();
                mw.setCallback(function(){
                    ftmLoading('Deleting task...');
                    ftmCall('delete-task', {tid:args.tid}, function(conf){
                        if(isObject(conf) && conf.result){
                            ftmSuccess('The task has been deleted.', true);
                            setTimeout(function(){__currentModalWindow.close();}, 1500);

                            $li = $ftm.find('li.tid-' + args.tid);
                            $tl = $li.closest('.ftm-task-list');
                            $li.remove();
                            if(conf.tlid_status_count){
                                $tl.find('.active-count').text(conf.tlid_status_count.active);
                                $tl.find('.ftm-task-list-completed span').text(conf.tlid_status_count.completed);
                            }
                        }
                        else ftmWebError(conf, 'An error occured while deleting the task.', true);
                        __currentModalWindow.showCancel().setCancelLabel('Close');
                    });
                    return false;
                });
                break;


        /**
         * Deletes a task list.
         */
            case 'delete-task-list':
                if(__currentModalWindow) __currentModalWindow.close();
                mw = new ftmModalWindow({title:'Confirm task list deletion', content:'Are you sure you wish to delete this task list?<br />All tasks and data associated with this task list will be removed as well.', cancelLabel:'No, don\'t delete', submitLabel:'Yes, delete this task list', width:400}).open();
                mw.setCallback(function(){
                    ftmLoading('Deleting task list...');
                    ftmCall('delete-task-list', {tlid:args.tlid}, function(conf){
                        if(isObject(conf) && conf.result){
                            ftmSuccess('The task list has been deleted.', true);
                            $ftm.find('.ftm-task-list.tlid-' + args.tlid).remove();
                            setTimeout(function(){__currentModalWindow.close();}, 1500);
                            ftmRecalculateNav();
                        }
                        else ftmWebError(conf, 'An error occured while deleting the task list.', true);
                        __currentModalWindow.showCancel().setCancelLabel('Close');
                    });
                    return false;
                });
                break;


        /**
         * Status change (active <> completed), not cancellation!
         */
             case 'status-change':
                var isComplete = $h.is(':checked'), tid = $li.data('tid');

                $li.addClass('busy ' + (isComplete ? 'completing' : 'restoring'));
                ftmCall('save-task', {status:isComplete ? 2 : 1, tid:tid}, function(conf){
                    if(isObject(conf) && isNumeric(conf.result) && conf.result){
                        $li.parent('.ftm-task-list').find('.active-tasks').text(conf.tlid_status_count.active + ' active tasks');
                        $li.remove();
                        ftmRecalculateScroll();

                        if(__ftmStorage[tid]) __ftmStorage[tid].status = isComplete ? 2 : 1;
                        if(conf.tlid_status_count){
                            $tl.find('.active-count').text(conf.tlid_status_count.active);
                            $tl.find('.ftm-task-list-completed span').text(conf.tlid_status_count.completed);
                        }
                    }
                    else $li.removeClass('busy').addClass('status-error');
                });
                break;


        /**
         * Toggle completed tasks in an open task list.
         */
            case 'toggle-completed':
                $tl = $h.closest('.ftm-task-list');
                var $ulc = $tl.find('ul.completed');
                if($ulc.length){
                    $ulc.remove();
                    ftmRecalculateScroll();
                }
                else{
                    $ulc = $('<ul class="completed"><li class="loading"><span></span>Loading completed tasks...</li></ul>').insertAfter($h);
                    ftmRecalculateScroll();
                    ftmCall('get-tasks', {tlid:$tl.data('tlid'), status:2}, function(result){
                        if(isObject(result) && result.result){
                            if(result.result && !result.result.length) $ulc.find('li.loading').removeClass('loading').addClass('empty').html('<span></span>There are no completed tasks.');
                            else for(tid in result.result){
                                $ulc.find('li.loading').remove();
                                label = String(result.result[tid].label).replace('\\"', '"').replace("\\'", "'");
                                $ulc.append('<li data-tid="' + tid + '" class="ftm-task status-2 tid-' + tid + '"><input class="ftm-chk-status" type="checkbox" onchange="ftm(\'status-change\', {handle:this});" checked="checked" /><a onclick="ftm(\'task-details\', {handle:this});">' + label + '</a></li>');
                                if(isObject(result.result[tid])) __ftmStorage[tid] = result.result[tid];
                            }
                            ftmRecalculateScroll();
                        }
                        else $ulc.find('li').removeClass('loading').addClass('error').text(ftmWebError(result, 'An error occured while loading the completed tasks.'));
                    });
                }
                break;


        /**
         * Task list navigation
         */
            case 'prev-list':
                $('.ftm-task-list:visible:first').hide();
                ftmRecalculateNav();
                console.log($('.ftm-task-list:visible:first'));
                break;
            case 'next-list':
                $('.ftm-task-list:hidden:last').show();
                ftmRecalculateNav();
                console.log($('.ftm-task-list:hidden:last'));
                break;
        }


        //---------------------------------------------------

        function ftmCall(action, args, callback){
            if(!isObject(args)) args = {};
            args.action = 'ftm';
            args.a = action;
            $.get(typeof ajaxurl !== 'undefined' && isString(ajaxurl) ? ajaxurl : '/wp-admin/admin-ajax.php', args, false, 'json').always(callback);
        }


        function ftmMessage(msg, type, clearModalContents){
            var msgMw = $('.ftm-modal-content-wrapper');
            if(!msgMw.length) msgMw = new ftmModalWindow({content:'', title:type == 'error' ? 'Error' : '', width:400}).open().hideButtons().find('.ftm-modal-content-wrapper');
            if(clearModalContents) msgMw.html('');
            else msgMw.find('.ftm-message' + (type ? '.' + type : '')).remove();
            msgMw.prepend('<div class="ftm-message ftm-' + type + '">' + msg + '</div>');
        }
        function ftmRemoveMessage(type){$('.ftm-message' + (type ? '.ftm-' + type : '')).remove();}
        function ftmError(msg, clearModalContents){ftmMessage(msg, 'error', clearModalContents);}
        function ftmSuccess(msg, clearModalContents){ftmMessage(msg, 'success', clearModalContents);}
        function ftmWebError(APIResult, altErr, clearModalContents){ftmError(isObject(APIResult) && APIResult.errors ? APIResult.errors.join('<br />') : altErr, clearModalContents);}

        function ftmLoading(msg){
            var lmw = __currentModalWindow && __currentModalWindow.find('.ftm-modal-content-wrapper') ? __currentModalWindow : new ftmModalWindow({title:'', content:'&nbsp;', width:400}).open().hideButtons();
            lmw.setContent('<div class="ftm-loading">' + msg + '</div>').hideButtons();
        }

        function ftmRecalculateScroll(){
            var maxHeight = $(window).height() - 180;
            $ftmc.find('.ftm-task-list-content').each(function(){
                var $t = $(this).find('div.scroll');
                if($t.find('.scroll-inner').height() > maxHeight) $t.css({height:maxHeight + 'px', maxHeight:maxHeight + 'px', overflowY:'scroll'});
                else $t.css({height:'auto', maxHeight:'none', overflowY:'visible'});
            });
        }

        /**
         * Shows or hides the list navigation.
         * When the new task list isn't visible, offers a prev function which hides the last visible item in the list.
         * When the last task list isn't visible, offers a next function to unhide the first non-visible element.
         */
        function ftmRecalculateNav(){
            var $nav = $ftm.find('#ftm-list-nav'),
                offsetNew = $ftm.find('.ftm-new-task-list').offset(),
                $firstHiddenTaskList = $ftm.find('.ftm-task-list:hidden'),
                $prev = $nav.find('.prev'),
                $next = $nav.find('.next');

            if(!offsetNew || !isObject(offsetNew) || !$nav.length) return;

            // Hidden
            if(offsetNew.left > -2 && !$firstHiddenTaskList.length) return $nav.hide();
            $nav.show();

            if(offsetNew.left < -1) $prev.show(); else $prev.hide();
            if($firstHiddenTaskList.length) $next.show(); else $next.hide();
        }

        return this;
    };
}(jQuery));

var ftm, __ftmStorage = {}, __ftmTimestamp = 0;
jQuery(document).ready(function(){
    ftm = jQuery(document).ftm;
    ftm('init');
});




function isNumeric(mixedVar){return (typeof(mixedVar) === 'number' || typeof(mixedVar) === 'string') && mixedVar !== '' && !isNaN(mixedVar);}
function isType(o, type){return String(typeof o).toLowerCase() == String(type).toLowerCase();}
function isArray(v){ return !!(typeof v == 'Array');}
function isObject(o){return isType(o, 'object');}
function isString(o){return isType(o, 'string');}
function isFunction(o){return isType(o, 'function');}
function newUniqueId(){
    var id = String(Math.random()*(new Date()).getTime()).replace('.', '');
    if(__uniqueIdsHandedOut['id' + id]) return newUniqueId();
    __uniqueIdsHandedOut['id' + id] = true;
    return id;
}
var __uniqueIdsHandedOut = {};


/**
 * Modal windows - 4 November 2014
 * Styling in defaults.css.
 */
var __currentModalWindow, // Will hold the current (active) modal window
    __modalWindowPool = {}; // Will hold a pool of all modal windows

var ftmModalWindow = function(args){
    args = isObject(args) ? args : {};
    return {
        id:             args.id || 'ftm-modal-' + newUniqueId(),
        class:          args.class || false,
        data:           isObject(args.data) ? args.data : {},

        __width:        isNumeric(args.width) ? args.width : 600,
        __height:       isNumeric(args.height) ? args.height : null,
        __content:      args.content || false,
        __title:        args.title || false,
        __body:         jQuery('body'),
        __zindex:       isNumeric(args.zindex) ? args.zindex : 100000,

        dom:            false,

        showSubmitOnInit:args.showSubmit !== false,
        showCancelOnInit:args.showCancel !== false,
        submitLabel:    args.submitLabel || args.buttonLabel || 'Submit',
        cancelLabel:    args.cancelLabel || args.closeLabel || 'Close',
        closeOnOverlayClick: args.closeOnOverlayClick,
        hideClose:      args.hideClose,

        showing:        false,


        /**
         * Opens the modal window instance
         * @returns {*}
         */
        open:           function(){
            var c = this.__template
                .replace('{zindex-overlay}', isNumeric(this.__zindex) ? 'z-index:' + this.__zindex : '')
                .replace('{zindex}', isNumeric(this.__zindex) ? 'z-index:' + (this.__zindex + 1) : '');

            c = c.replace('{class}', this.id + ' ' + (this.class ? this.class : ''))
                .replace(/\{id\}/g, this.id);

            // No close button
            if(this.hideClose) c = c.replace('<a class="ftm-modal-close">x</a>', '');

            // Buttons
            c = c.replace('{buttons}', '<div class="ftm-modal-buttons">' +
                (this.showCancelOnInit ? '<a class="ftm-button subtle cancel">' + (this.cancelLabel ? this.cancelLabel : 'Cancel') + '</a>' : '') +
                (this.showSubmitOnInit ? '<a class="ftm-button submit">' + (this.submitLabel ? this.submitLabel : 'Submit') + '</a>' : '') +
                '</div>');

            // Append to body and populate some variables. Then fire off events.
            this.__body.append(c);
            this.dom = this.__body.find('.' + this.id);
            this.showing = true;
            this.setTitle();
            this.setContent();
            this.setWidth();
            this.setHeight();

            var t = this;
            __currentModalWindow = this;
            __modalWindowPool[this.id] = this;
            this.__body.trigger('modalWindowOpen', {instance:t});
            if(this.showSubmitOnInit) this.dom.find('.ftm-modal-buttons .submit').click(function(){t.submit(t);});
            this.__body.find((this.closeOnOverlayClick ? '.ftm-modal-overlay.for-' + this.id + ', ' : '') + '.' + this.id + ' .ftm-modal-buttons .ftm-button.cancel, .' + this.id + ' .ftm-modal-close').click(function(){t.close(t);});
            return this;
        },

        /**
         * Closes the modal window instance, or attaches an event handler to be fired on remove.
         * @param instanceOrEventHandler
         * @returns {*}
         */
        close:          function(instanceOrEventHandler){
            if(!instanceOrEventHandler) instanceOrEventHandler = __currentModalWindow;
            else if(isFunction(instanceOrEventHandler) && this.dom) return this.dom.bind('destroyed', instanceOrEventHandler);
            instanceOrEventHandler.__body.trigger('modalWindowClose', {instance:instanceOrEventHandler});
            jQuery('.ftm-modal-overlay.for-' + instanceOrEventHandler.id + ', .' + instanceOrEventHandler.id).remove();
            instanceOrEventHandler.showing = false;
            return this;
        },

        center:         function(){console.warn('ModalWindow.center(); is no longer in use.'); return this;},

        __validate:       isFunction(args.validate) ? args.validate : function(value){return true;},
        setValidate:    function(v){if(isFunction(v)) this.__validate = v; return this;},

        __callback:       isFunction(args.callback) ? args.callback : function(value){return true;},
        setCallback:    function(v){if(isFunction(v)) this.__callback = v; return this;},

        /*
         * Submits the popup window
         * > Callback gets called when the validate function returns 'true'
         * > Window gets closed if the callback function returns anything else than 'false'
         */
        submit:         function(instance){
            if(!instance) instance = __currentModalWindow;
            if((isFunction(instance.__validate) && instance.__validate()) || !isFunction(instance.__validate)){
                if(isFunction(instance.__callback)){
                    var cb = instance.__callback();
                    if(cb != false) instance.close();
                }
            }
            return this;
        },

        // Set content & title
        setContent:     function(c){
            if(c) this.__content = c;
            else c = this.__content ? this.__content : '';
            if(this.showing) this.dom.find('.ftm-modal-content-wrapper').html(c);
            this.__body.trigger('modalWindowContentSet', {instance:this});
            //this.find('.chzn-container').css('z-index', this.__zindex + 10).find('.chzn-drop').css('z-index', this.__zindex + 11);
            return this;
        },

        setTitle:       function(c){
            if(c) this.__title = c;
            else c = this.__title ? this.__title : '';
            if(this.showing) this.dom.find('.ftm-modal-title').html(c);
            this.__body.trigger('modalWindowTitleSet', {instance:this});
            return this;
        },

        setWidth:       function(v){
            v = isNumeric(v) ? v : this.__width;
            if(isNumeric(v)){
                this.__width = v < 0 ? $(window).width() + v : v;
                if(this.dom) this.dom.width(this.__width);
            }
            return this;
        },

        setHeight:       function(v){
            v = isNumeric(v) ? v : this.__height;
            if(isNumeric(v)){
                this.__height = v < 0 ? $(window).height() + v : v;
                if(this.dom) this.dom.find('.ftm-modal-content-wrapper').height(this.__height - 100).css('max-height', (this.__height - 100) + 'px');
            }
            return this;
        },

        resetHeight:    function(){
            this.__height = null;
            if(this.dom) this.dom.find('.ftm-modal-content-wrapper').height('auto').css('max-height', 'auto');
            return this;
        },

        resetWidth:    function(){
            this.__width = null;
            if(this.dom) this.dom.find('.ftm-modal-content-wrapper').width('auto').css('max-width', 'auto');
            return this;
        },

        setZIndex:      function(i){
            if(!isNumeric(i)) return;
            this.__zindex = i;
            if(this.dom){
                $('.ftm-modal-overlay.for-' + this.id).css('z-index', i);
                this.dom.css('z-index', i+1);
            }
            return this;
        },

        setButtons:     function(html){
            if(empty(html)) this.dom.find('.ftm-modal-buttons').html('').hide();
            else this.dom.find('.ftm-modal-buttons').html(html);
            return this;
        },

        print:          function(){
            var $body = $('body').children().each(function(){
                var $t = $(this);
                if(!($t.hasClass('modal') && $t.find('.ftm-modal-content').length)){
                    $t.addClass('print-hide');
                }
            }).addClass('print-mode');
            this.dom.addClass('print-mode');

            window.print();

            $body.removeClass('print-mode').find('.print-hide').removeClass('print-hide');
            this.dom.removeClass('print-mode');
        },

        hideSubmit:function(){if(this.dom) this.dom.find('.ftm-modal-buttons a.submit').hide().css('visibility', 'hidden'); return this;},
        showSubmit:function(){if(this.dom) this.dom.find('.ftm-modal-buttons a.submit').show().css('visibility', 'visible'); return this;},
        setSubmitLabel: function(label){if(this.dom) this.dom.find('.ftm-modal-buttons a.submit').html(label); this.showSubmit(); return this;},

        hideCancel:function(){if(this.dom) this.dom.find('.ftm-modal-buttons a.cancel').hide().css('visibility', 'hidden'); return this;},
        showCancel:function(){if(this.dom) this.dom.find('.ftm-modal-buttons a.cancel').show().css('visibility', 'visible'); return this;},
        setCancelLabel: function(label){if(this.dom) this.dom.find('.ftm-modal-buttons a.cancel').html(label); this.showCancel(); return this;},


        hideButtons:    function(){if(this.dom) this.dom.find('.ftm-modal-buttons .ftm-button, .ftm-modal-buttons button').hide(); return this;},
        showButtons:    function(){if(this.dom) this.dom.find('.ftm-modal-buttons .ftm-button, .ftm-modal-buttons button').show(); return this;},

        find:           function(selector){return this.dom.find(selector);},

        __template:     '<div class="ftm-modal-overlay for-{id}" style="{zindex-overlay}"><div class="ftm-modal-overlay-inner">' +
            '<div id="{id}" class="ftm-modal-window {class}" style="{zindex}"><h3 class="ftm-modal-title">&nbsp;</h3><a class="ftm-modal-close">x</a>' +
            '<div class="ftm-modal-content"><div class="ftm-modal-content-wrapper">&nbsp;</div>{buttons}</div>' +
            '</div></div></div>'
    }
};