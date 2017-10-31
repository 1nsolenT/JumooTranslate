(function () {
    'use strict';

    function translateHub($rootScope) {

        var hub = {

            connect: function (hubName, progressCallback) {
                try {
                    var connection = $.hubConnection('/umbraco/backoffice/signalR');
                    var proxy = connection.createHubProxy(hubName);


                    return {

                        start: function () {
                            connection.start();
                        },
                        on: function (eventName, callback) {
                            proxy.on(eventName, function (result) {
                                $rootScope.$apply(function () {
                                    if (callback) {
                                        callback(result);
                                    }
                                });
                            });
                        },
                        invoke: function (methodName, callback) {
                            proxy.invoke(methodName)
                                .done(function (result) {
                                    $rootScope.$apply(function () {
                                        if (callback)
                                            callback(result);
                                    });
                                });
                        }
                    }
                }
                catch (e) {
                    console.warn("signalR - hub could not be created");
                    return null;
                }
            }
        };

        return hub;

    }

    angular.module('umbraco.resources')
        .factory('translateHub', translateHub);

})();

