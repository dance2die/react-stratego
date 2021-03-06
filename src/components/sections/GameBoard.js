import React, { Component } from 'react';
import DropSpace from '../widgets/GameSpace.js';
import DragPiece from '../widgets/GamePiece.js';
import Modal from '../widgets/Modal.js';
import { PIECES } from '../Helpers.js';
import { xyToId } from '../Helpers.js';
import { idToXy } from '../Helpers.js';
import QuickLoadMenu from '../menus/QuickLoad.js';

class GameBoard extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			spaces: {},
			selectedSpace: 1,
			battleContent: (
				<div className="row">
					<h3 className="col-12 text-center">Attacking...</h3>
				</div>
			),
			battleModalOpen: false
		};
		this.obscuredSpaces = { 43: true, 44: true, 47: true, 48: true, 53: true, 54: true, 57: true, 58: true };
		this.renderGameSpace = this.renderGameSpace.bind(this);
		this.gameSpaceRow = this.gameSpaceRow.bind(this);
		this.borderRow = this.borderRow.bind(this);
		this.gameSpaceRows = this.gameSpaceRows.bind(this);
		this.placePiece = this.placePiece.bind(this);
		this.emptySpace = this.emptySpace.bind(this);
		this.resetSpace = this.resetSpace.bind(this);
		this.placementArrowMove = this.placementArrowMove.bind(this);
		this.openBattleModal = this.openBattleModal.bind(this);
		this.closeBattleModal = this.closeBattleModal.bind(this);
		this.getBattleContent = this.getBattleContent.bind(this);
		this.props.app.gameBoard = this;
	}
	componentDidMount() {
		var app = this.props.app;
		var game = this.props.game;
		var spaces = this.props.game.props.spaces;
		var uid = app.state.currentUser.user_id;

		if (app.tileRack) {
			if (game.props.starter == uid) {
				app.tileRack.playerColor = 'blue';
			}
			else {
				app.tileRack.playerColor = 'red';
			}
		}
		if (spaces && app.tileSpaces) {
			var soldiers = 0;
			for (var i in spaces) {
				var space = spaces[i];
				var targetSpace = null;
				if (space.rank && app.tileSpaces[space.rank]) {
					targetSpace = app.tileSpaces[space.rank];
				}
				this.placePiece({ rank: space.rank, color: space.color, tileSpace: targetSpace }, space.id, true);
				if (space.rank && space.rank != 'F' && space.rank != 'B') {
					soldiers++;
				}
				if (targetSpace) {
					targetSpace.setState({ remaining: targetSpace.remaining });
				}
			}
			var players = game.state.players;
			players[app.tileRack.playerColor].soldiers = soldiers;
			game.setState({ players: players });
		}
	}
	placementArrowMove(keyCode) {
		var { x, y } = idToXy(this.state.selectedSpace);
		switch (keyCode) {
			case 37:
				// Left Arrow
				x = Math.max(1,x-1);
			break;
			case 38:
				// Up Arrow
				y = Math.max(1,y-1);
			break;
			case 39:
				// Right Arrow
				x = Math.min(10,x+1);
			break;
			case 40:
				// Down Arrow
				y = Math.min(10,y+1);
			break;
		}
		var spaceId = xyToId(x,y);
		this.selectSpace(spaceId);
	}
	placeByKeyboard(rank) {
		rank = rank.toUpperCase();
		var app = this.props.app;
		var spaceId = parseInt(this.state.selectedSpace);
		var playerColor = app.tileRack.playerColor;
		var targetSpace = app.tileSpaces[rank];
		this.placePiece({ rank: rank, color: playerColor, tileSpace: targetSpace }, spaceId, false);
	}
	selectSpace(id) {
		var playerColor = this.props.app.tileRack.playerColor;
		var placementMinY = (playerColor == 'red') ? 1 : 7;
		var placementMaxY = (playerColor == 'red') ? 4 : 10;
		var minId = xyToId(1,placementMinY);
		var maxId = xyToId(10,placementMaxY);
		var oldSelected = parseInt(this.state.selectedSpace) || 1;
		if (id < minId) {
			id = Math.max(oldSelected,minId);
		}
		if (id > maxId) {
			id = Math.min(oldSelected,maxId);
		}
		this.setState({ selectedSpace: id });
		this.resetSpace(id);
		this.resetSpace(oldSelected);
	}
	openBattleModal() {
		this.setState({ battleModalOpen: true });
	}
	closeBattleModal() {
		this.setState({ battleModalOpen: false });
	}
	getBattleContent(result) {
		if (!result || !result.attack_rank) {
			return null;
		}
		var app = this.props.app;
		var game = this.props.game;
		var attackRank = PIECES[result.attack_rank].name;
		var defendRank = PIECES[result.defend_rank].name;
		var playerColor = app.tileRack.playerColor;
		var attacking = result.attack_color == playerColor;
		var playerRank = attacking ? attackRank : defendRank;
		var defeated = result.defeated;
		var oppColor = (playerColor == 'red') ? 'blue' : 'red';
		var oppRank = attacking ? defendRank : attackRank;
		var starterId = parseInt(game.props.starter);
		var uid = parseInt(app.state.currentUser.user_id);
		var oppName = (starterId == uid) ? game.props.opponentName : game.props.starterName;
		var outcome = '';
		var resultText = '';
		var spaces = this.state.spaces;
		var remaining = 0;
		var players = game.state.players;
		var afterText = '';
		
		if (defeated == 'both') {
			game.addCaptured({ color: result.attack_color, rank: result.attack_rank });
			game.addCaptured({ color: result.defend_color, rank: result.defend_rank });
		}
		else {
			var defeatedRank;
			if (result.attack_color == defeated) {
				defeatedRank = result.attack_rank;
			}
			else {
				defeatedRank = result.defend_rank;
			}
			game.addCaptured({ color: defeated, rank: defeatedRank });
		}
		for (var i in spaces) {
			var space = spaces[i];
			if (space.rank && space.color == playerColor && space.rank != 'F' && space.rank) {
				remaining++;
			}
		}
		if (defendRank == 'Bomb') {
			this.emptySpace(result.space_id);
			this.emptySpace(result.from_space_id);
		}
		if (defeated == 'both') {
			this.emptySpace(result.space_id);
			this.emptySpace(result.from_space_id);
			players[oppColor].soldiers--;
			players[playerColor].soldiers = remaining - 1;
			game.setState({ players: players });
			outcome = 'Draw!';
			resultText = (<span>Your <strong>{playerRank}</strong> and <strong className='text-opponent-color'>{oppName}&apos;s</strong> <strong>{oppRank}</strong> defeated each other!</span>)
		}
		else if (defeated == playerColor) {
			outcome = 'Defeat!';
			var action = 'defeated';
			players[playerColor].soldiers = remaining - 1;
			game.setState({ players: players });
			if (defendRank == 'Bomb' && attacking) {
				outcome = 'Catastrope!';
				action = 'blown up';
			}
			else if (defendRank == 'Bomb') {
				outcome = 'Sabotage!';
				action = 'defused';
			}
			else if (defendRank == 'Flag') {
				outcome = 'Defeated!';
				action = 'captured';
				// OH ALSO YOU LOSE THE GAME
			}
			if (players[playerColor].soldiers < 1) {
				outcome = 'Defeated!';
				afterText = (
					<p className="mx-auto text-center">Your entire army has been conquered!</p>
				);
			}
			resultText = (<span>Your <strong>{playerRank}</strong> was {action} by <strong className='text-opponent-color'>{oppName}&apos;s</strong> <strong>{oppRank}</strong>!</span>)
		}
		else {
			outcome = 'Victory!';
			players[oppColor].soldiers--;
			game.setState({ players: players });
			var action = 'defeated';
			if (defendRank == 'Bomb' && attacking) {
				outcome = 'Success!';
				action = 'defused';
			}
			else if (defendRank == 'Bomb') {
				outcome = 'Success!';
				action = 'blew up';
			}
			else if (defendRank == 'Flag') {
				action = 'captured';
				// OH ALSO YOU WIN THE GAME
			}
			if (players[oppColor].soldiers < 1) {
				outcome = 'Victory!';
				afterText = (
					<p className="mx-auto text-center"><strong className="text-opponent-color">{oppName}&apos;s</strong> entire army is defeated!</p>
				);
			}
			resultText = (<span>Your <strong>{playerRank}</strong> {action} <strong className='text-opponent-color'>{oppName}&apos;s</strong> <strong>{oppRank}</strong>!</span>)
		}
		var players = game.state.players;
		var content = (
			<div className="row">
				<h3 className="col-12 text-center battle-heading">{outcome}</h3>
				<p className="col-12 battle-text text-center">{resultText}</p>
				{afterText}
				<div className="col-6">
					<DragPiece color={result.attack_color} rank={result.attack_rank} placed={true} className="float-right" />
				</div>
				<div className="col-6">
					<DragPiece color={result.defend_color} rank={result.defend_rank} placed={true} className="" />
				</div>
			</div>
		);
		this.setState({ battleContent: content });
	}
	renderGameSpace(row,col,key,piece) {
		var occupied = (piece !== undefined);
		return <DropSpace id={key} board={this} y={row} x={col} occupied={occupied} key={key} passable={!(this.obscuredSpaces[key] || false)} game={this.props.game}>
				{piece}
			</DropSpace>;
	}
	emptySpace(id) {
		var spaces = this.state.spaces;
		var app = this.props.app;
		var playerColor = app.tileRack.playerColor;
		var space = spaces[id];
		var newSpace = this.renderGameSpace(space.props.y,space.props.x,id);
		spaces[id] = newSpace;
		this.setState({ spaces: spaces });
		return newSpace;
	}
	clearBoard() {
		var spaces = this.state.spaces;
		var app = this.props.app;
		var playerColor = app.tileRack.playerColor;
		for (var id in spaces) {
			var space = spaces[id];
			if (space.props.occupied && space.props.children && space.props.children.props.color == playerColor) {
				var newSpace = this.renderGameSpace(space.props.y,space.props.x,id);
				spaces[id] = newSpace;
			}
		}
		this.setState({ spaces: spaces });
		app.tileRack.resetCounts();
	}
	// 'id' in placePiece refers to the board square id
	placePiece(pieceInfo,id,loading) {
		var spaces = this.state.spaces;
		var app = this.props.app;
		var game = this.props.game;
		var battle = false;
		var playerColor = app.tileRack.playerColor;
		var { x, y, territory } = spaces[id].props;
		var { rank, color, tileSpace } = pieceInfo;
		if (x == pieceInfo.fromX && y == pieceInfo.fromY) {
			return;
		}
		if (pieceInfo.fromId) {
			if (!this.props.game.state.started) {
				if (!spaces[id].props.occupied) {
					// Render the target space with the piece in it, and empty the source space.
					spaces[pieceInfo.fromId] = this.renderGameSpace(pieceInfo.fromY,pieceInfo.fromX,pieceInfo.fromId);
				}
				else {
					// Swap the pieces
					var occupantInfo = spaces[id].props.children.props;
					var fromPiece =  (<DragPiece color={pieceInfo.color} rank={pieceInfo.rank} fromX={x} fromY={y} fromId={id} placed={true} />);
					var toPiece =  (<DragPiece color={occupantInfo.color} rank={occupantInfo.rank} fromX={pieceInfo.fromX} fromY={pieceInfo.fromY} fromId={pieceInfo.fromId} placed={true} />);
					spaces[id] = this.renderGameSpace(y,x,id,fromPiece);
					spaces[pieceInfo.fromId] = this.renderGameSpace(pieceInfo.fromY,pieceInfo.fromX,pieceInfo.fromId,toPiece);
					this.setState({spaces: spaces});
					app.saveActiveGame();
					return;
				}
			}
			else {
				if (!spaces[id].props.occupied) {
					// Render the target space with the piece in it, and empty the source space.
					spaces[pieceInfo.fromId] = this.renderGameSpace(pieceInfo.fromY,pieceInfo.fromX,pieceInfo.fromId);
					this.props.game.toggleTurn();
				}
				else {
					// BATTLE
					var attacks = game.state.attacks + 1;
					battle = true;
					this.openBattleModal();
					var uid = app.state.currentUser.user_id;
					var userKey = app.state.currentUser.userKey;
					if (!uid || !userKey) {
						return [];
					}
					var gameId = app.state.activeGame.props.id;
					var formData = new FormData();
					var app = this.props.app;
					spaces[pieceInfo.fromId] = this.renderGameSpace(pieceInfo.fromY,pieceInfo.fromX,pieceInfo.fromId);
					formData.append('game_id',gameId);
					formData.append('user_id',uid);
					formData.append('userKey',userKey);
					formData.append('from_space_id',pieceInfo.fromId);
					formData.append('space_id',id);
					formData.append('spaces',spaces);
					formData.append('attack_rank',rank);
					formData.append('attack_color',color);
					var board = this;
					window.fetch(app.gameServer+'battle', {
						method: 'POST', 
						body: formData
					}).then(function(data){
						data.text().then(function(text) {
							if (!text.length) {
								return;
							}
							var result = JSON.parse(text);
							board.getBattleContent(result);
							game.setState({ attacks: attacks });
						});
					});
				}
			}
		}
		if (tileSpace) {
			if (!tileSpace.remaining) {
				return;
			}
			if (spaces[id].props.occupied) {
				var occupantInfo = spaces[id].props.children.props;
				if (occupantInfo.color == color && occupantInfo.rank == rank) {
					return;
				}
				else if (occupantInfo.color == color) {
					this.props.app.tileSpaces[occupantInfo.rank].setState({remaining: this.props.app.tileSpaces[occupantInfo.rank].remaining+1});
					this.props.app.tileSpaces[occupantInfo.rank].remaining++;
				}
			}
			if (color == playerColor) 
			{
				tileSpace.remaining--;
				app.tileRack.remaining--;
				if (!app.tileRack.remaining) {
					app.tileRack.setState({ allPlaced: true });
				}
			}
			tileSpace.setState({ remaining: tileSpace.remaining });
		}
		spaces[id] = this.renderGameSpace(y,x,id,<DragPiece color={color} fromX={x} fromY={y} fromId={id} rank={rank} placed={true} game={this.props.game} />);
		this.setState({spaces: spaces});
		if (!loading && !battle) {
			app.saveActiveGame();
		}
	}
	resetSpace(id) {
		var spaces = this.state.spaces;
		var space = spaces[id];
		spaces[id] = this.renderGameSpace(space.props.y,space.props.x,id,space.props.children);
		this.setState({ spaces: spaces })
	}
	borderRow(id,cols) {
		if (!cols) {
			cols = 12;
		}
		var borderSpaces = [];
		for (var i = 1; i <= cols; i++) {
			borderSpaces.push(
				<div className="gameSpace-wrapper border-wrapper col px-0 mx-0" key={id+"-"+i}>
					<div className="gameSpace borderSpace" id={id+"-"+i}></div>
				</div>
			);
		}
		return (
			<div className="gameSpaceRow borderSpaceRow text-center" id={id} key={id}>
				{borderSpaces}
			</div>
		);
	}
	gameSpaceRow(row,start,end,colSize) {
		var offset = (row - 1) * (colSize || 10);
		var gameSpaces = [];
		gameSpaces.push(
				<div className="gameSpace-wrapper border-wrapper left-wrapper col px-0 mx-0" key={"left-border-"+row}>
					<div className="gameSpace borderSpace left-border" id={"left-border-"+row}></div>
				</div>
		);
		for (var i = start; i <= end; i++) {
			var newSpace = null;
			if (!this.state.spaces[offset+i]) {
				newSpace = this.renderGameSpace(row,i,offset+i);
				this.state.spaces[offset+i] = newSpace;
			}
			else {
				newSpace = this.state.spaces[offset+i];
			}
			gameSpaces.push(newSpace);
		}
		gameSpaces.push(
				<div className="gameSpace-wrapper border-wrapper right-wrapper col px-0 mx-0" key={"right-border-"+row}>
					<div className="gameSpace borderSpace right-border" id={"right-border-"+row}></div>
				</div>
		);
		return (
			<div className="gameSpaceRow text-center" key={row}>
				{gameSpaces}
			</div>
		);
	}
	gameSpaceRows(start,end,cols) {
		var rows = [];
		rows.push(this.borderRow('top-border'));
		for (var i = start; i <= end; i++) {
			rows.push(this.gameSpaceRow(i,1,10,10));
		}
		rows.push(this.borderRow('bottom-border'));
		return rows;
	}
	render() {
		var game = this.props.game;
		var app = this.props.app;
		return (
			<div className="gameBoard">
				<QuickLoadMenu app={app} game={game} />
				<Modal
					closeButton={true}
					closeCallback={this.closeBattleModal}
					id="battle-modal"
					app={app}
					content={this.state.battleContent}
					open={this.state.battleModalOpen}
					additionalClasses={"p-5 text-black"}
				/>
				{this.gameSpaceRows(1,10,10)}
			</div>
		)
	}
}

export default GameBoard;
