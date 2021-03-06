function depends_html (){
    var deps = [];
    return deps;
};

// ToDo: data-lock as reading
/* Example
    <input type="checkbox" data-type="html"
           data-checked="dummy2:STATE" data-map-checked='{"on":"true", "off":"false"}'
           data-changed="dummy2:STATE" data-map-changed='{"true":"on", "false":"off"}'>
*/

var Modul_html = function () {

    function mappedValue(map, readval) {

        if( (typeof map === "object") && (map !== null) ){
            var len = Object.keys(map).length;
            for ( var i=0; i<len; i++) {
                if ( readval == Object.keys(map)[i]
                     || readval.match(new RegExp('^' + Object.keys(map)[i] + '$')) ) {
                     return Object.values(map)[i];
                }
            };
        }
        return elem.data('value');
    }

    function onClicked(elem) {

      console.log('onClicked',elem);

      if( elem.isValidData('url') ) {
          document.location.href = elem.data('url');
          var hashUrl=window.location.hash.replace('#','');
          if ( hashUrl && elem.isValidData('load') ) {
              elem.closest('nav').trigger('changedSelection',[elem.text()]);
              var sel = elem.data('load');
              if ( sel ) {
                  $(sel).siblings().removeClass('active');
                  //load page if not done until now
                  if ($(sel+" > *").children().length === 0 || elem.hasClass('nocache'))
                      loadPage(elem);
                  $(sel).addClass('active');
              }
          }
      } else if( elem.isValidData('url-xhr') ) {
          ftui.toast(elem.data('url-xhr'));
          $.get(elem.data('url-xhr'));
      } else if( elem.isValidData('fhem-cmd') ) {
          ftui.toast(elem.data('fhem-cmd'));
          ftui.setFhemStatus(elem.data('fhem-cmd'));
      } else {

          var value = '';
          var map = elem.data('map-clicked');

          if( (typeof map === "object") && (map !== null) ){
              var len = Object.keys(map).length;
              value = Object.values(map)[0];
              for ( var i=0; i<len; i++) {
                  if ( elem.hasClass(Object.keys(map)[i]) ){
                      if (i+1 == len){ value = Object.values(map)[0]; }
                      else { value = Object.values(map)[i+1]; }
                      break;
                  }
              };
          }
          elem.data('value', value);
          changed(elem);
      };

    }

    function onChanged(elem) {

        console.log('onChanged',elem);
        //re-map current state of the control into value
        var value = '';
        var map = elem.data('map-changed');

        if( (typeof map === "object") && (map !== null) ){
            var len = Object.keys(map).length;
            value = Object.values(map)[0];
            for ( var i=0; i<len; i++) {
                if ( elem.attr('type') === 'checkbox' ) {
                    if (elem[0].checked.toString() === Object.keys(map)[i] ){
                        value = Object.values(map)[i];
                        break;
                    }
                }
            };
        } else if ( elem.attr('type') === 'range'
                   || elem.attr('type') === 'radio'
                   || elem[0].nodeName === 'SELECT' ) {
            value = elem.val();
        }
        elem.data('value', value);
        console.log('value',value);
        changed(elem);
    }

    function changed(elem) {

        console.log('changed',elem);

        var device = elem.data('device');
        var reading = elem.data('clicked') || elem.data('changed') || '';
        // fully qualified readings => DEVICE:READING
        if(reading.match(/:/)) {
            var fqreading = reading.split(':');
            device = fqreading[0]
            reading = fqreading[1];
        }
        // fill objects for mapping from FHEMWEB paramid to device + reading
        if (isValid(device) && isValid(reading)){
            elem.data('set', (reading==='STATE') ? '' : reading);
            elem.data('device',device);
        }
        // exchange value and send to FHEM
        elem.transmitCommand();
    }

    function init () {
        var me = this;
        this.elements = $('[data-type="'+this.widgetname+'"]',this.area);
        this.elements.each(function(index) {

            var elem = $(this);
            elem.initData('val'     , elem.data('value'));
            elem.initData('value'   , elem.val());
            elem.initData('set'     , '');
            elem.initData('cmd'     , 'set');
            elem.initData('part'    , -1);

            if ( elem.isDeviceReading('val') ) {me.addReading(elem,'val');}
            if ( elem.isDeviceReading('content') ) {me.addReading(elem,'content');}
            if ( elem.isDeviceReading('class') ) {me.addReading(elem,'class');}

            console.log('elem type:',elem,elem.attr('type') );

            if ( elem.attr('type') === 'checkbox'
                  || elem.attr('type') === 'radio'
                  || elem.attr('type') === 'range'
                  || elem[0].nodeName === 'SELECT' ) {
                elem.on('change',function() {
                    onChanged(elem);
                });
            } else if ( elem.attr('type') === 'text' ){
                elem.bind("enterKey",function(e){
                    elem.blur();
                    changed(elem);
                });
                elem.keyup(function(e){
                    elem.data('value', elem.val());
                    if(e.keyCode === 13)
                        elem.trigger("enterKey");
                });
            } else {
                elem.on('click',function() {
                    onClicked(elem);
                });
            }

        });
    };

    function update (dev,par) {

        me = this;
        //reading for value
        me.elements.filterDeviceReading('val',dev,par)
        .each(function(index) {
            var elem = $(this);
            var value = elem.getReading('val').val;

            if ( elem.attr('type') === 'range' || elem.attr('type') === 'text'
                 || elem[0].nodeName === 'SELECT' ) {
                elem.val(value);
            }

        });

        //reading for content
        me.elements.filterDeviceReading('content',dev,par)
        .each(function(idx) {
            var elem = $(this);
            var content = elem.getReading('content').val;
            if(content) {
                var part = elem.data('part');
                var cont = ftui.getPart(content,part);
                elem.html(cont);
            }
        });

        //reading for class
        me.elements.filterDeviceReading('class',dev,par)
        .each(function(idx) {
            var elem = $(this);
            var read = elem.getReading('class').val;
            if(read) {
                var map = elem.data('map-class');
                if( (typeof map === "object") && (map !== null) ){
                    $.each(map, function (key, value) {
                        elem.removeClass(value);
                    });
                }
                elem.addClass( mappedValue(map, read) );
            }
        });

        //reading for checked
        me.elements.filterDeviceReading('checked',dev,par)
        .each(function(idx) {
            var elem = $(this);
            var read = elem.getReading('checked').val;
            if(read) {
                var map = elem.data('map-checked');
                elem.prop('checked', mappedValue(map, read) === 'true');
            }
        });

    };

    return $.extend(new Modul_widget(), {

        widgetname: 'html',
        init: init,
        update: update,
    });
};
