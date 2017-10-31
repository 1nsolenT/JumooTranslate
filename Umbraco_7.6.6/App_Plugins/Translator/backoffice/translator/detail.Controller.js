(function () {
    'use strict';

    function detailController($scope, $routeParams, $window,
        localizationService,
        translateNodeService,
        translatorService,
        notificationsService)
    {
        var vm = this;
        vm.loaded = false;
        vm.page = {
            title: "detail",
            description: "detail description"
        };

        vm.node = {};

        vm.editValue = editValue;
        vm.saveValue = saveValue;
        vm.cancel = cancelEdit;

        vm.saveAll = save;
        vm.cancelAll = cancel;

        loadNode($routeParams.id);

        //////////////////

        function loadNode(nodeId) 
        {
            translateNodeService.getNode(nodeId)
                .then(function (result) {
                    vm.loaded = true;
                    vm.node = result.data;

                    vm.page.title = vm.node.MasterNodeName
                        + " to "
                        + vm.node.TargetNodeName;

                    localizationService.localize("translate_translation")
                        .then(function (value) {
                            vm.page.description = vm.node.Culture.DisplayName + " " + value;
                        });

                    vm.node.editable = false; 
                    if (vm.node.Status == 'InProgress' || vm.node.Status == 'Updated') {
                        vm.node.editable = true;
                    }

                    makeValueProperties(vm.node.Groups);

                });
        }


        function editValue(value) {
            value.editing = true;
        }

        function saveValue(value) {
            if (value.HtmlControl)
            {
                value.Value = value.editor.value;
            }

            value.Translated = true;
            value.editing = false; 
        }

        function cancelEdit(value) {
            value.Translated = false;
            value.editing = false;
        }

        function save() {
            // do the full save back to the system here...
            translatorService.updateProperties(vm.node.Id, vm.node.Groups)
                .then(function (result) {
                    notificationsService
                        .success("Saved",
                            localizationService.localize("translateUpdates_properties")
                        );

                    // redirect back in history....
                    $window.history.back();

                });
        }

        function cancel() {
            $window.history.back();
        }

        function makeValueProperties(propertyGroups) {

            angular.forEach(propertyGroups, function (group, key) {
                angular.forEach(group.Properties, function (property, key) {
                    angular.forEach(property.Target, function (value, key) {

                        if (value.HtmlControl) {
                            value.editor = {
                                label: 'bodyText',
                                description: 'Load some stuff here',
                                view: 'rte',
                                config: {
                                    editor: {
                                        toolbar: ["code", "undo", "redo", "cut", "bold", "italic"],
                                        stylesheets: [],
                                        dimensions: { height: 300, width: '100%' }
                                    }
                                },
                                value: value.Value
                            };
                        }
                    });
                });
            });
        }
    }

    angular.module('umbraco')
        .controller('translate.detailController', detailController);
})();