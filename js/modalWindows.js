/**
 * Modal windows - 4 November 2014
 * Styling in defaults.css.
 */
var __currentModalWindow, // Will hold the current (active) modal window
    __modalWindowPool = {}; // Will hold a pool of all modal windows

var ftmModalWindow = function(args){
    args = isObject(args) ? args : {};
    return {
        id:             args.id || 'modal-' + newUniqueId(),
        class:          args.class || false,
        data:           isObject(args.data) ? args.data : {},

        __width:        isNumeric(args.width) ? args.width : 600,
        __height:       isNumeric(args.height) ? args.height : null,
        __content:      args.content || false,
        __title:        args.title || false,
        __body:         jQuery('body'),
        __zindex:       isNumeric(args.zindex) ? args.zindex : 1000,

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
            if(this.hideClose) c = c.replace('<a class="modal-close">x</a>', '');

            // Buttons
            c = c.replace('{buttons}', '<div class="modal-buttons">' +
                (this.showCancelOnInit ? '<a class="button subtle cancel">' + (this.cancelLabel ? this.cancelLabel : 'Cancel') + '</a>' : '') +
                (this.showSubmitOnInit ? '<a class="button submit">' + (this.submitLabel ? this.submitLabel : 'Submit') + '</a>' : '') +
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
            if(this.showSubmitOnInit) this.dom.find('.modal-buttons .submit').click(function(){t.submit(t);});
            this.__body.find((this.closeOnOverlayClick ? '.modal-overlay.for-' + this.id + ', ' : '') + '.' + this.id + ' .modal-buttons .button.cancel, .' + this.id + ' .modal-close').click(function(){t.close(t);});
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
            jQuery('.modal-overlay.for-' + instanceOrEventHandler.id + ', .' + instanceOrEventHandler.id).remove();
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
            if(this.showing) this.dom.find('.modal-content-wrapper').html(c);
            this.__body.trigger('modalWindowContentSet', {instance:this});
            //this.find('.chzn-container').css('z-index', this.__zindex + 10).find('.chzn-drop').css('z-index', this.__zindex + 11);
            return this;
        },

        setTitle:       function(c){
            if(c) this.__title = c;
            else c = this.__title ? this.__title : '';
            if(this.showing) this.dom.find('.modal-title').html(c);
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
                if(this.dom) this.dom.find('.modal-content-wrapper').height(this.__height - 100).css('max-height', (this.__height - 100) + 'px');
            }
            return this;
        },

        resetHeight:    function(){
            this.__height = null;
            if(this.dom) this.dom.find('.modal-content-wrapper').height('auto').css('max-height', 'auto');
            return this;
        },

        resetWidth:    function(){
            this.__width = null;
            if(this.dom) this.dom.find('.modal-content-wrapper').width('auto').css('max-width', 'auto');
            return this;
        },

        setZIndex:      function(i){
            if(!isNumeric(i)) return;
            this.__zindex = i;
            if(this.dom){
                $('.modal-overlay.for-' + this.id).css('z-index', i);
                this.dom.css('z-index', i+1);
            }
            return this;
        },

        setButtons:     function(html){
            if(empty(html)) this.dom.find('.modal-buttons').html('').hide();
            else this.dom.find('.modal-buttons').html(html);
            return this;
        },

        print:          function(){
            var $body = $('body').children().each(function(){
                var $t = $(this);
                if(!($t.hasClass('modal') && $t.find('.modal-content').length)){
                    $t.addClass('print-hide');
                }
            }).addClass('print-mode');
            this.dom.addClass('print-mode');

            window.print();

            $body.removeClass('print-mode').find('.print-hide').removeClass('print-hide');
            this.dom.removeClass('print-mode');
        },

        hideSubmit:function(){if(this.dom) this.dom.find('.modal-buttons a.submit').hide().css('visibility', 'hidden'); return this;},
        showSubmit:function(){if(this.dom) this.dom.find('.modal-buttons a.submit').show().css('visibility', 'visible'); return this;},
        setSubmitLabel: function(label){if(this.dom) this.dom.find('.modal-buttons a.submit').html(label); this.showSubmit(); return this;},

        hideCancel:function(){if(this.dom) this.dom.find('.modal-buttons a.cancel').hide().css('visibility', 'hidden'); return this;},
        showCancel:function(){if(this.dom) this.dom.find('.modal-buttons a.cancel').show().css('visibility', 'visible'); return this;},
        setCancelLabel: function(label){if(this.dom) this.dom.find('.modal-buttons a.cancel').html(label); this.showCancel(); return this;},


        hideButtons:    function(){if(this.dom) this.dom.find('.modal-buttons .button, .modal-buttons button').hide(); return this;},
        showButtons:    function(){if(this.dom) this.dom.find('.modal-buttons .button, .modal-buttons button').show(); return this;},

        find:           function(selector){return this.dom.find(selector);},

        __template:     '<div class="modal-overlay for-{id}" style="{zindex-overlay}"><div class="modal-overlay-inner">' +
            '<div id="{id}" class="modal-window {class}" style="{zindex}"><h3 class="modal-title">&nbsp;</h3><a class="modal-close">x</a>' +
            '<div class="modal-content"><div class="modal-content-wrapper">&nbsp;</div>{buttons}</div>' +
            '</div></div></div>'
    }
};