(function() {
    'use strict';

    function langController($scope, $routeParams,
        translateCultureService,
        translatorService,
        translateJobService,
        localizationService,
        notificationsService)
    {


        var vm = this;
        vm.pageNo = 1; 
        vm.loaded = false;
        vm.cultureId = $routeParams.id;

        vm.page = {
            title: "Translations",
            description: ""
        };

        vm.viewJob = viewJob;

        // init
        getCultureInfo(vm.cultureId);

        ///////////////////
        function viewJob(job) {
            window.location.href = "#/translator/translator/job/" + job.Id;
        }

        ///////////////////
        function getCultureInfo(cultureId) {
            translateCultureService.getCultureInfo(cultureId)
                .then(function (result) {
                    vm.culture = result.data;

                    localizationService.localize("translate_translations")
                        .then(function (value) {
                            vm.page.title = value + " " + vm.culture.DisplayName;
                        });

                    vm.page.description =
                        localizationService.localize("translate_awaiting");
                });
        }

        function getJobs(cultureId, page) {
            translatorService.getJobs(cultureId, page)
                .then(function (result) {
                    vm.results = result.data;
                    vm.loaded = true;
                    calculateProgress(vm.results.Items);
                }, function (error) {
                    notificationsService.error("Error", error.data.ExceptionMessage);
                });
        }

        function calculateProgress(jobs) {
            jobs.forEach(function (job) {
                job.progress = 0;
                job.totalDone = '.';
                job.totalCount = '.';

                translateJobService.getAllNodesInJob(job.Id)
                    .then(function (result) {
                        calculateJobProgress(job, result.data);
                    });
            });
        }

        function calculateJobProgress(job, nodes) {

            var complete = 0;
            var count = 0;

            nodes.forEach(function (node) {
                node.Groups.forEach(function (group) {
                    group.Properties.forEach(function (property) {
                        property.Target.forEach(function (target) {
                            if (target.Translated) {
                                complete++;
                            }
                            count++;
                        })
                    });
                });
            });

            job.progress = complete / count * 100;
            job.totalDone = complete;
            job.totalCount = count;
        }
            /*
            // calculate how much of this is translated.
            // was going to do nodes that are updated, but 
            // this is more accurate (and overkill)
            for (var j = 0; j < jobs.length; j++) {
                var done = 0;
                var count = 0;
                for (var n = 0; n < jobs[j].Nodes.length; n++) {
                    for (var g = 0; g < jobs[j].Nodes[n].Groups.length; g++) {
                        for (var p = 0; p < jobs[j].Nodes[n].Groups[g].Properties.length; p++) {
                            for (var t = 0; t < jobs[j].Nodes[n].Groups[g].Properties[p].Target.length; t++) {
                                if (jobs[j].Nodes[n].Groups[g].Properties[p].Target[t].Translated) {
                                    done++;
                                }
                                count++;
                            }
                        }
                    }
                };

                jobs[j].progress = done / count * 100;
                jobs[j].totalDone = done;
                jobs[j].totalCount = count;
            }
            */
        

        function refreshView() {
            vm.loaded = false;
            getJobs(vm.cultureId, vm.pageNo);
        }

        vm.nextPage = function () {
            vm.pageNo++;
            refreshView();
        }

        vm.prevPage = function () {
            vm.pageNo--;
            refreshView();
        }

        vm.goToPage = function (pageNo) {
            vm.pageNo = pageNo;
            refreshView();
        }

        refreshView();

    }

    angular.module('umbraco')
        .controller('translator.langController', langController);
})(); 