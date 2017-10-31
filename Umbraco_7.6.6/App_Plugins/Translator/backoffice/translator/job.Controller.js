(function() {
    'use strict';

    function jobController($scope, $routeParams,
        localizationService,
        translateJobService,
        translateNodeService, 
        translatorService,
        notificationsService) {
        var vm = this;
        vm.loaded = false;
        vm.page = {
            title: "",
            description: ""
        };

        vm.submitbuttonState = 'init';

        vm.jobId = $routeParams.id;

        vm.job = {};

        vm.submitJob = submitJob;
        vm.viewNode = viewNode;
        vm.viewLang = viewLang;
        vm.pageNo = 1;

        refresh($routeParams.id, vm.pageNo);

        ////////////////////

        function refresh(jobId, pageId) {
            vm.job.ready = false; 
            loadJob(jobId);
            loadNodes(jobId, pageId);
        }

        function submitJob() {

            vm.submitbuttonState = 'busy';

            translatorService.submitJob(vm.job.Id, vm.Nodes)
                .then(function (result) {
                    notificationsService.success('Saved',
                        localizationService.localize("translator_returned")
                    );

                    refresh(vm.job.Id, vm.pageNo);
                    vm.submitbuttonState = 'success';

                }, function (error) {
                    notificationsService.error('Failed', error.data.ExceptionMessage);
                    vm.submitbuttonState = 'error';
                });
        }

        function viewNode(node) {
            // if (node.Status == 'InProgress' || node.Status == 'Updated') {
                window.location.href = "#/translator/translator/detail/" + node.Id;
            // }
        }

        function viewLang(job) {
            window.location.href = '#/translator/translator/lang/' + job.TargetCulture.LCID;
        }

        ////////////////////

        function loadJob(id) {
            translateJobService.getById(id)
                .then(function (result) {
                    vm.job = result.data;
                    vm.page.title = vm.job.Name + " [ " + 
                        vm.job.SourceCulture.DisplayName + " to " +
                        vm.job.TargetCulture.DisplayName + " ] "
                    vm.page.description = vm.job.Status;
                   
                }, function (error) {
                    notificationsService.error("Not Found", error.data.ExceptionMessage);
                });
        }

        function calculateProgress(nodes) {
            for (var n = 0; n < nodes.length;n++) {
                var done = 0;
                var count = 0;

                if (nodes[n].Status == 'Updated') {
                    vm.job.ready = true;
                }

                for (var g = 0; g < nodes[n].Groups.length; g++) {
                    for (var p = 0; p < nodes[n].Groups[g].Properties.length; p++) {
                        for (var s = 0; s < nodes[n].Groups[g].Properties[p].Target.length; s++) {
                            if (nodes[n].Groups[g].Properties[p].Target[s].Translated) {
                                done++;
                            }
                            count++;
                        }
                    }
                }
                nodes[n].progress = done / count * 100;
                nodes[n].valueCount = count;
                nodes[n].doneCount = done;
            };
        }

        function loadNodes(id, page) {
            translateJobService.getNodesByJob(id, page)
                .then(function (result) {
                    vm.nodes = result.data;
                    calculateProgress(vm.nodes.Items);
                    vm.loaded = true;
                }, function (error) {
                    notificationsService
                        .error("Cannot load nodes", error.data.ExceptionMessage);
                });
        }

        vm.nextPage = function () {
            vm.pageNo++;
            loadNodes(vm.jobId, vm.pageNo);
        }

        vm.prevPage = function () {
            vm.pageNo--;
            loadNodes(vm.jobId, vm.pageNo);
        }

        vm.goToPage = function (pageNo) {
            vm.pageNo = pageNo;
            loadNodes(vm.jobId, vm.pageNo);
        }



    }

    angular.module('umbraco')
        .controller('translate.jobController', jobController);
})();