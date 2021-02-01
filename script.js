(function() {
  // USAGE:
  // 1. include this pen in your pen's javascript assets
  // 2. create a new instance with `var preview = new PreviewImage("path/to/your/image.jpg");
  // 3. kill it when you want it to go away `p.clear();`
  var Bullet, Enemy, Player, PreviewImage, bulletEnemyHandler, bullet_time, bullets, bullets_count, checkInput, controls, create, currentHorizontalDirection, currentVerticalDirection, drawShape, enemies, enemies_bullets, enemies_count, game, gameOver, killEnemy, max_delay, min_delay, motion, motionUpdate, motion_timer, moveBullets, moveEnemies, movePlayer, nextLevel, player, playerEnemyHandler, preload, preview, render, resetGame, score, score_text, slowDownTime, spawnText, speed, speedUpTime, text, time, update, updateMotion, updateScore;

  PreviewImage = function(url) {
    var pi;
    pi = {
      setup: function() {
        pi.el = document.createElement('div');
        pi.el.style.background = 'url(' + url + ') no-repeat center center';
        pi.el.style.backgroundSize = 'cover';
        pi.el.style.zIndex = '1000';
        pi.el.style.width = '100%';
        pi.el.style.top = '0';
        pi.el.style.bottom = '0';
        pi.el.style.left = '0';
        pi.el.style.position = 'fixed';
        document.body.appendChild(pi.el);
      },
      clear: function() {
        pi.el.remove();
      }
    };
    pi.setup();
    return pi;
  };

  //---------------------------------------------------
  // VARIABLES
  //---------------------------------------------------
  player = null;

  bullets = null;

  bullets_count = 3;

  bullet_time = 0;

  enemies = null;

  enemies_count = 0;

  enemies_bullets = null;

  time = 0;

  speed = 10;

  motion = 0;

  motion_timer = null;

  max_delay = 60;

  min_delay = 1;

  text = null;

  score = 0;

  score_text = null;

  controls = [];

  currentVerticalDirection = false;

  currentHorizontalDirection = false;

  preview = new PreviewImage("https://s3-us-west-2.amazonaws.com/s.cdpn.io/150586/supershoot.png"); //PREVIEW IMAGE

  
  //---------------------------------------------------
  // GAME CLASS
  //---------------------------------------------------

  //PRELOAD STATE
  preload = function() {};

  // nothing to preload ¯\_(ツ)_/¯

  //CREATE STATE
  create = function() {
    
    //remove preview image
    preview.clear();
    
    //set scale mode
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignVertically = true;
    game.scale.pageAlignHorizontally = true;
    
    //background color
    game.stage.backgroundColor = '#CCCCCC';
    
    //start physics engine
    game.physics.startSystem(Phaser.Physics.ARCADE);
    //input
    this.game.input.keyboard.addKeyCapture(Phaser.Keyboard.SPACEBAR);
    this.game.input.keyboard.addKeyCapture(Phaser.Keyboard.UP);
    this.game.input.keyboard.addKeyCapture(Phaser.Keyboard.DOWN);
    this.game.input.keyboard.addKeyCapture(Phaser.Keyboard.LEFT);
    this.game.input.keyboard.addKeyCapture(Phaser.Keyboard.RIGHT);
    controls = {
      "up": game.input.keyboard.addKey(Phaser.Keyboard.UP),
      "down": game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
      "left": game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
      "right": game.input.keyboard.addKey(Phaser.Keyboard.RIGHT)
    };
    //start the game
    return nextLevel();
  };

  //RESET THE GAME
  resetGame = function() {
    var bullet, enemy, i;
    
    //nuke everything
    game.world.removeAll();
    //score text
    score_text = game.add.text(game.world.width - 60, 10, score);
    score_text.align = 'right';
    score_text.font = 'Orbitron';
    score_text.fontSize = 40;
    score_text.fill = '#ff0000';
    
    //add player  
    player = new Player(game, game.rnd.integerInRange(100, game.world.width - 100), 500, drawShape(32, 32, '#FFFFFF'));
    
    //ada player's bullet group
    bullets = game.add.group();
    
    //add bullets to memory so we can throttle the shot 
    i = 0;
    while (i < bullets_count) {
      bullet = new Bullet(game, 0, 0, drawShape(10, 10, '#000000'));
      bullets.add(bullet);
      bullet.events.onOutOfBounds.add(bullet.kill, bullet);
      i++;
    }
    
    //add enemies and enemy bullets
    enemies = game.add.group();
    enemies_bullets = game.add.group();
    i = 0;
    while (i < enemies_count) {
      enemy = new Enemy(game, game.rnd.integerInRange(100, game.world.width - 100), game.rnd.integerInRange(50, 150), drawShape());
      enemies.add(enemy);
      i++;
    }
    
    //create a new timer. this timer will act as our motion timer that we'll use to update time and motion instead of the main game update loop. If the game update loops breaks, the motion will stay constant
    return motion_timer = game.time.events.loop(60, motionUpdate, this);
  };

  
  //DRAW SHAPES
  drawShape = function(width = 64, height = 64, color = '#ff0000') {
    var bmd;
    bmd = game.add.bitmapData(width, height);
    bmd.ctx.beginPath();
    bmd.ctx.rect(0, 0, width, height);
    bmd.ctx.fillStyle = color;
    bmd.ctx.fill();
    return bmd;
  };

  
  //CHECK INPUT
  checkInput = function() {
    // change time on input
    if (controls.up.isDown || controls.down.isDown || controls.left.isDown || controls.right.isDown) {
      speedUpTime();
    } else {
      slowDownTime();
    }
    
    // determine what direction the player is moving
    if (controls.left.isDown) {
      currentHorizontalDirection = "left";
    } else if (controls.right.isDown) {
      currentHorizontalDirection = "right";
    } else {
      currentHorizontalDirection = false;
    }
    if (controls.up.isDown) {
      currentVerticalDirection = "up";
    } else if (controls.down.isDown) {
      currentVerticalDirection = "down";
    } else if (!currentHorizontalDirection) { // if nothing assume up
      currentVerticalDirection = "up";
    } else {
      currentVerticalDirection = false;
    }
    // fire!
    if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
      return player.fireBullet(currentHorizontalDirection, currentVerticalDirection);
    }
  };

  //MOVEMENT
  movePlayer = function() {
    return player.motionUpdate();
  };

  moveEnemies = function() {
    // Move the enemies towards the player at the rate of the game motion
    return enemies.forEachAlive(function(enemy) {
      return enemy.motionUpdate();
    });
  };

  moveBullets = function() {
    // player bullets
    bullets.forEachAlive(function(bullet) {
      return bullet.motionUpdate();
    });
    // enemy bullets
    return enemies_bullets.forEachAlive(function(bullet) {
      return bullet.motionUpdate();
    });
  };

  
  //COLLISION HANDLERS
  playerEnemyHandler = function(player, enemy) {
    //you dead. tint the player for a moment and then reset the game
    if (enemy.can_kill) {
      enemy.can_kill = false;
      player.tint = 0xff0000;
      return game.time.events.add(Phaser.Timer.SECOND * 0.2, function() {
        return gameOver();
      }, this);
    }
  };

  bulletEnemyHandler = function(bullet, enemy) {
    enemy.tint = 0x000000;
    bullet.kill();
    enemy.can_kill = false;
    updateScore(score += 1);
    return game.time.events.add(Phaser.Timer.SECOND * 0.2, function() {
      return killEnemy(enemy);
    }, this);
  };

  killEnemy = function(enemy) {
    enemy.kill();
    if (!enemies.getFirstAlive()) {
      return nextLevel();
    }
  };

  
  //MANIPULATE TIME
  speedUpTime = function() {
    if (motion_timer.delay > min_delay) {
      motion_timer.delay -= 2;
    } else {
      motion_timer.delay = min_delay;
    }
    return time = motion_timer.delay + speed;
  };

  slowDownTime = function() {
    if (motion_timer.delay < max_delay) {
      motion_timer.delay += 2;
    } else {
      motion_timer.delay = max_delay;
    }
    return time = motion_timer.delay - speed;
  };

  
  //UPDATE MOTION
  updateMotion = function() {
    // always keep some motion and factor it by the time
    return motion = (100 - (time * 2)) + speed;
  };

  
  //GAME OVER
  gameOver = function() {
    enemies_count = 1;
    updateScore(0);
    resetGame();
    spawnText("GAME");
    return game.time.events.add(Phaser.Timer.SECOND * 0.5, function() {
      return spawnText("OVER");
    }, this);
  };

  
  //NEXT LEVEL  
  nextLevel = function() {
    // increase enemies and reset the game
    enemies_count++;
    resetGame();
    spawnText("BOX MAN FOR YOU");
    return game.time.events.add(Phaser.Timer.SECOND * 1.5, function() {
      return spawnText("SUPERSHOOT: SAGA EDITION #3");
    }, this);
  };

  
  //SPAWN TEXT
  spawnText = function(text = false, lifespan = 1.5) {
    if (text) {
      text = game.add.text(game.world.centerX, game.world.centerY, text);
      text.anchor.set(0.5);
      text.align = 'center';
      text.font = 'Orbitron';
      text.fontSize = 45;
      text.fill = '#ff0000';
      return game.time.events.add(Phaser.Timer.SECOND * lifespan, function() {
        return text.kill();
      }, this);
    }
  };

  //MANAGE SCORE
  updateScore = function(points) {
    score = points;
    return score_text.text = score;
  };

  
  //MOTION UPDATE LOOP
  motionUpdate = function() {
    updateMotion();
    movePlayer();
    moveEnemies();
    return moveBullets();
  };

  
  //MAIN GAME UPDATE LOOP
  update = function() {
    checkInput();
    
    // player vs enemies
    game.physics.arcade.overlap(player, enemies, playerEnemyHandler, null, this);
    // enemy fire vs player
    game.physics.arcade.overlap(player, enemies_bullets, playerEnemyHandler, null, this);
    // bullets vs enemies
    game.physics.arcade.overlap(bullets, enemies, bulletEnemyHandler, null, this);
    // bullets vs bullets
    return game.physics.arcade.collide(bullets, enemies_bullets);
  };

  // enemies vs enemies
  // game.physics.arcade.collide(enemies)

  //RENDER / DEBUG
  render = function() {};

  //game.debug.text "Move with arrow keys. Shoot with spacebar.", 30, 40
  // game.debug.text "Clock Delay " + motion_timer.delay + " / Time " + time + " / Motion " + motion, 30, 65

  //---------------------------------------------------
  // Player CLASS
  //---------------------------------------------------
  Player = function(game, x, y, sprite) {
    Phaser.Sprite.call(this, game, x, y, sprite);
    game.physics.arcade.enable(this);
    this.game = game;
    this.anchor.set(0.5);
    this.checkWorldBounds = true;
    this.events.onOutOfBounds.add(this.reposition, this);
    this.body.drag.x = 1;
    this.body.drag.y = 1;
    return game.add.existing(this);
  };

  //EXTENDS SPRITE CLASS
  Player.prototype = Object.create(Phaser.Sprite.prototype);

  Player.prototype.constructor = Player;

  //PLAYER MOTION UPDATE LOOP
  Player.prototype.motionUpdate = function() {
    var speed_modifier;
    //player should move slightly faster than enemies
    speed_modifier = speed / 6;
    if (controls.up.isDown) {
      this.body.velocity.y = -motion * speed_modifier;
    } else if (controls.down.isDown) {
      this.body.velocity.y = motion * speed_modifier;
    }
    if (controls.left.isDown) {
      this.body.velocity.x = -motion * speed_modifier;
    } else if (controls.right.isDown) {
      this.body.velocity.x = motion * speed_modifier;
    }
    if (!controls.up.isDown && !controls.down.isDown && !controls.left.isDown && !controls.right.isDown) {
      if (this.body.velocity.x > 0) {
        this.body.velocity.x -= motion / 2;
      } else if (this.body.velocity.x < 0) {
        this.body.velocity.x += motion / 2;
      }
      if (this.body.velocity.y > 0) {
        return this.body.velocity.y -= motion / 2;
      } else if (this.body.velocity.y < 0) {
        return this.body.velocity.y += motion / 2;
      }
    }
  };

  Player.prototype.reposition = function() {
    if (this.x < 0) {
      return this.x = game.world.width;
    } else if (this.x > game.world.width) {
      return this.x = 0;
    } else if (this.y < 0) {
      return this.y = game.world.height;
    } else if (this.y > game.world.height) {
      return this.y = 0;
    }
  };

  Player.prototype.fireBullet = function(h = false, v = false) {
    var bullet;
    if (game.time.now > bullet_time) {
      bullet = bullets.getFirstExists(false);
      if (bullet) {
        bullet.reset(this.x, this.y);
        bullet.h = h;
        bullet.v = v;
        bullet.mass = 1;
        return bullet_time = game.time.now + 150;
      }
    }
  };

  
  //---------------------------------------------------
  // BULLET CLASS
  //---------------------------------------------------
  Bullet = function(game, x, y, sprite, h = false, v = "up") {
    Phaser.Sprite.call(this, game, x, y, sprite);
    game.physics.arcade.enable(this);
    this.game = game;
    this.exists = false;
    this.visible = false;
    this.checkWorldBounds = true;
    this.angle = 45;
    this.anchor.set(0.5);
    this.mass = 0.2;
    this.can_kill = true;
    this.h = h;
    return this.v = v;
  };

  //EXTENDS SPRITE CLASS
  Bullet.prototype = Object.create(Phaser.Sprite.prototype);

  Bullet.prototype.constructor = Bullet;

  //BULLET MOTION UPDATE LOOP
  Bullet.prototype.motionUpdate = function() {
    var speed_modifier;
    
    //bullets should move faster than characters
    speed_modifier = speed / 2;
    switch (this.h) {
      case "left":
        this.body.velocity.x = -motion * speed_modifier;
        break;
      case "right":
        this.body.velocity.x = motion * speed_modifier;
    }
    switch (this.v) {
      case "up":
        return this.body.velocity.y = -motion * speed_modifier;
      case "down":
        return this.body.velocity.y = motion * speed_modifier;
    }
  };

  
  //---------------------------------------------------
  // ENEMY CLASS
  //---------------------------------------------------
  Enemy = function(game, x, y, sprite) {
    Phaser.Sprite.call(this, game, x, y, sprite);
    game.physics.arcade.enable(this);
    this.game = game;
    this.anchor.set(0.5);
    this.checkWorldBounds = true;
    this.events.onOutOfBounds.add(this.reposition, this);
    this.body.bounce.x = 1;
    this.body.bounce.y = 1;
    this.body.drag.x = 1;
    this.body.drag.y = 1;
    this.type = _.sample([1, 2, 3, 4, 5]);
    this.can_kill = true;
    return this.can_shoot = true;
  };

  //EXTENDS SPRITE CLASS
  Enemy.prototype = Object.create(Phaser.Sprite.prototype);

  Enemy.prototype.constructor = Enemy;

  //ENEMY MOTION UPDATE LOOP
  Enemy.prototype.motionUpdate = function() {
    
        // move enemy based on type
    switch (this.type) {
      case 1:
        // just move down
        this.body.velocity.y = motion;
        break;
      case 2:
        // just move left
        this.body.velocity.x = -motion;
        break;
      case 3:
        // just move right
        this.body.velocity.x = motion;
        break;
      default:
        //follow the player
        this.game.physics.arcade.moveToObject(this, player, motion);
    }
    
    // shoot to kill!
    if (this.can_shoot) {
      this.fireBullet();
      this.can_shoot = false;
      
      // randomly throttle firing
      return this.game.time.events.add(Phaser.Timer.SECOND * this.game.rnd.integerInRange(3, 10), function() {
        return this.can_shoot = true;
      }, this);
    }
  };

  Enemy.prototype.reposition = function() {
    if (this.x < 0) {
      return this.x = game.world.width;
    } else if (this.x > game.world.width) {
      return this.x = 0;
    } else if (this.y < 0) {
      return this.y = game.world.height;
    } else if (this.y > game.world.height) {
      return this.y = 0;
    }
  };

  Enemy.prototype.fireBullet = function() {
    var buffer, bullet, h, v;
    bullet = new Bullet(game, 0, 0, drawShape(10, 10, '#ff0000'));
    enemies_bullets.add(bullet);
    bullet.reset(this.x, this.y);
    // shoot towards the player
    buffer = 100;
    if (player.x < this.x - buffer) {
      h = "left";
    } else if (player.x > this.x + buffer) {
      h = "right";
    } else {
      h = false;
    }
    if (player.y < this.y - buffer) {
      v = "up";
    } else if (player.y > this.y + buffer) {
      v = "down";
    } else {
      v = false;
    }
    bullet.h = h;
    return bullet.v = v;
  };

  
  //---------------------------------------------------
  // INIT
  //---------------------------------------------------
  game = new Phaser.Game(900, 600, Phaser.AUTO, "game", {
    preload: preload,
    create: create,
    update: update,
    render: render
  });

}).call(this);

//# sourceMappingURL=https://docs.google.com/document/d/e/2PACX-1vQMOAobjCy7rdZXbfvciDuV9ZhMNluzZHOnxgdyjD398cv62gzVp5XWqoaoB7Pu7bljyvgNR-TmOlgX/pub
//# sourceURL=coffeescript