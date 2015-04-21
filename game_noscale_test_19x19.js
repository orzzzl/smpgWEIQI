'use strict';

angular.module('myApp', ['ngDraggable']).controller('Ctrl', 
	function ($rootScope,$scope, $log, $timeout, gameService, gameLogic, scaleBodyService, resizeGameAreaService) {

	resizeGameAreaService.setWidthToHeight(1);
    var moveAudio = new Audio('audio/move.wav');
    moveAudio.load();
	
	/*global variables*/
	var rowsNum = 19;
    var colsNum = 19;
	/*global variables*/
	window.handleDragEvent = handleDragEvent;
	function handleDragEvent(type, clientX, clientY){
		
		var draggingLines = document.getElementById("draggingLines");
		var horizontalDraggingLine = document.getElementById("horizontalDraggingLine");
		var verticalDraggingLine = document.getElementById("verticalDraggingLine");
		//var clickToDragPiece = document.getElementById("clickToDragPiece");
		var gameArea = document.getElementById("gameArea");
		// Center point in gameArea
        var x = clientX - gameArea.offsetLeft;
        var y = clientY - gameArea.offsetTop;
		// Is outside gameArea?
        if (x < 0 || y < 0 || x >= gameArea.clientWidth || y >= gameArea.clientHeight) {
          draggingLines.style.display = "none";
		  clickToDragPiece.style.display = "none";
          return;
        }
		// Inside gameArea. Let's find the containing square's row and col
        var col = Math.floor(colsNum * x / gameArea.clientWidth);
        var row = Math.floor(rowsNum * y / gameArea.clientHeight);
		// if the cell is not empty, don't preview the piece, but still show the dragging lines
		if ($scope.board[row][col] === 'X' || $scope.board[row][col] === 'O') {
			return;
		}
		clickToDragPiece.style.display = "inline";
        draggingLines.style.display = "inline";
		var centerXY = getSquareCenterXY(row, col);
        verticalDraggingLine.setAttribute("x1", centerXY.x);
        verticalDraggingLine.setAttribute("x2", centerXY.x);
        horizontalDraggingLine.setAttribute("y1", centerXY.y);
        horizontalDraggingLine.setAttribute("y2", centerXY.y);
		// show the piece
		//var cell = document.getElementById('board' + row + 'x' + col).className = $scope.turnIndex === 0 ? 'black' : 'white';
		
		
        var topLeft = getSquareTopLeft(row, col);
		var circle = document.getElementById("circle");
		circle.setAttribute("fill", $scope.turnIndex === 0 ? 'black' : 'white');
        clickToDragPiece.style.left = topLeft.left + "px";
        clickToDragPiece.style.top = topLeft.top + "px";
        if (type === "touchend" || type === "touchcancel" || type === "touchleave" || type === "mouseup") {
          // drag ended
          clickToDragPiece.style.display = "none";
          draggingLines.style.display = "none";
          dragDone(row, col);
        }
	}
	function getSquareTopLeft(row, col) {
        var size = getSquareWidthHeight();
        return {top: row * size.height, left: col * size.width}
    }
	function getSquareWidthHeight() {
		var gameArea = document.getElementById("gameArea");
        return {
          width: gameArea.clientWidth / colsNum,
          height: gameArea.clientHeight / rowsNum
        };
    }
    function getSquareCenterXY(row, col) {
        var size = getSquareWidthHeight();
        return {
			x: col * size.width + size.width / 2,
			y: row * size.height + size.height / 2
        };
    }
	function dragDone(row, col) {
        $rootScope.$apply(function () {
          var msg = "Dragged to " + row + "x" + col;
          $log.info(msg);
          $scope.msg = msg;
		  cellClicked(row, col);
        });
    }

    function sendComputerMove() {
        gameService.makeMove(
                gameLogic.createComputerMove($scope.board,
                        $scope.captured,
                        $scope.passes,
                        $scope.turnIndex)
                );
    }

    function updateUI(params) {
        $scope.jsonState = angular.toJson(params.stateAfterMove, true);
        $scope.board = params.stateAfterMove.board;
        $scope.delta = params.stateAfterMove.delta;
        $scope.captured = params.stateAfterMove.captured;
        $scope.passes = params.stateAfterMove.passes;
        // Set initial state, or reset if somehow invalid
        if ($scope.board === undefined || $scope.captured === undefined ||
                $scope.passes === undefined) {
            $scope.board = gameLogic.getInitialBoard();
            $scope.captured = {black: 0, white: 0};
            $scope.passes = 0;
            $scope.notifications = "Nothing was dragged";
        } else {
            moveAudio.play();
        }
        $scope.isYourTurn = params.turnIndexAfterMove >= 0 &&
                params.yourPlayerIndex === params.turnIndexAfterMove;
        $scope.turnIndex = params.turnIndexAfterMove;
        //$log.info("updateUI: ", $scope.turnIndex);

        // Is it the computer's turn?
        if ($scope.isYourTurn && params.playersInfo[params.yourPlayerIndex].playerId === '') {
            // Wait 500ms for animation to end
            $timeout(sendComputerMove, 1000);
        }
    }

    // Before updateUI, show an empty board to viewer (so you can't perform moves)
    updateUI({stateAfterMove: {}, turnIndexAfterMove: 0, yourPlayerIndex: -2});

    $scope.passClicked = function () {
        //Clicking on the CLICK TO PASS button triggers this function
        //It will increment the number of passes.
        //The fraction indicates in the button notes how many
        //consecutive passes have been made (2 ends the game).
        $log.info(["Clicked on pass.", $scope.passes]);
        if (!$scope.isYourTurn) {
            return;
        }
        try {
            var delta = {row: -1, col: -1};
            var move = gameLogic.createMove($scope.board, delta, $scope.captured, $scope.passes, $scope.turnIndex);
            $scope.isYourTurn = false; // Prevent new move
            gameService.makeMove(move);
        } catch (e) {
            $log.info(["Cannot pass.", $scope.passes]);
            return;
        }
    };

	function cellClicked(rrow, ccol) {
        $log.info(["Clicked on cell:", rrow, ccol]);
        if (!$scope.isYourTurn) {
            return;
        }
        try {
            var delta = {row: rrow, col: ccol};
            var move = gameLogic.createMove($scope.board, delta, $scope.captured, $scope.passes, $scope.turnIndex);
            $scope.isYourTurn = false; // Prevent new move
            gameService.makeMove(move);
        } catch (e) {
            $log.info(["Cannot make move:", rrow, ccol]);
            return;
        }
    };
    $scope.shouldSlowlyAppear = function (rrow, ccol) {
        return $scope.delta !== undefined &&
                $scope.delta.row === rrow &&
                $scope.delta.col === ccol;
    };
    $scope.isEmpty = function (rrow, ccol) {
        return $scope.board[rrow][ccol] !== undefined &&
                $scope.board[rrow][ccol] === '';
    };

    $scope.onDropComplete = function (data, event, row, col) {
        $log.info("onDropComplete happened!", arguments);
        $scope.notifications = "Dropped piece " + data + " in " + row + "x" + col;
        $log.info($scope.isYourTurn);
        if (!$scope.isYourTurn || data===2) {
            $scope.notifications = "You can't use that piece.";
            return;
        }
        try {
            var delta = {row: row, col: col};
            var move = gameLogic.createMove($scope.board, delta, $scope.captured, $scope.passes, $scope.turnIndex);
            $scope.isYourTurn = false; // Prevent new move
            gameService.makeMove(move);
        } catch (e) {
            $log.info(["Cannot make move:", row, col]);
            return;
        }
      };
    //scaleBodyService.scaleBody({width: 450, height: 500});
    
    gameService.setGame({
        gameDeveloperEmail: "vangie.shue@gmail.com",
        minNumberOfPlayers: 2,
        maxNumberOfPlayers: 2,
        exampleGame: gameLogic.getExampleGame(),
        riddles: gameLogic.getRiddles(),
        isMoveOk: gameLogic.isMoveOk,
        updateUI: updateUI
    });
});