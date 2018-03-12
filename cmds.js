
const Sequelize = require ('Sequelize');
const {models} = require('./model');
const {log, biglog, errorlog, colorize} = require('./out');

exports.helpCmd = rl => {
            log("Comandos:");
	    	log("h/help - Muestra esta ayuda.");
	    	log("list: mostrar los quizzes existentes.");
	    	log("show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
	    	log("add: añadir un nuevo quiz interactivamente.");
	    	log("delete <id> - Borrar el quiz indicado");
	    	log("edit <id> - Editar el quiz indicado.");
	    	log("test <id> - probar el quiz indicado");
	    	log("p/play - jugar a preguntar aleatoriamente todos los quizzes");
	    	log("credits: créditos");
	    	log("c/quit: salir del programa.");
	    rl.prompt();
};	

exports.quitCmd = rl => {
	rl.close(); 
};

exports.addCmd = rl => {
	
	makeQuestion(rl, 'Introduzca una pregunta:')
	.then(q => {
		return makeQuestion(rl, 'Introduzca la respuesta ')
		.then(a => {
			return {question: q, answer: a};
		});
	})
	.then(quiz => {
		return models.quiz.create(quiz);
	})
	.then((quiz) => {
		log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error=> {
		errorlog('El quiz es erróneo');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

exports.listCmd = rl => {
	
models.quiz.findAll()
.each(quiz => {
		log (`[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
	})

.catch(error => {
	errorlog(error.message);
})
.then(() => {
	rl.prompt();
});
};


const validateId = id => {

	return new Sequelize.Promise ((resolve, reject) => {
		if (typeof id === "undefined") {
			reject(new Error (`falta el parámetro <id>.`));
		} else {
			id = parseInt(id);
			if(Number.isNaN(id)){
				reject(new Error (`El valor del parámetro <id> no es un número.`));
			} else {
				resolve(id);
			}
		}
	});
};


const makeQuestion = (rl, text) => {

	return new Sequelize.Promise ((resolve, reject) => {
		rl.question(colorize(text, 'red'), answer => {
			resolve(answer.trim());
		});
	});
};

exports.showCmd = (rl,id) => {

	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz) {
		throw new Error (`No existe un quiz asociado al id=${id}.`);
		}
		log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);

	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};



exports.testCmd = (rl,id) => {
	
	if (typeof id === "undefined"){
		errorlog(`Falta el parametro id.`);
		rl.prompt();
	}
	else {
		try{
			const quiz = model.getByIndex(id);
			rl.question(colorize(`${quiz.question}? `, 'red'), answer =>{
				answer = answer.trim();
				answer = answer.toLowerCase();
				if(answer == quiz.answer){
					log(`Su respuesta es correcta`);
					biglog('Correcta', 'green');
					rl.prompt();
				}
				else {
					log(`Su respuesta es incorrecta`);
					biglog('Incorrecta', 'red');
					rl.prompt();
				};
			});	
		}
		catch(error){
			errorlog(error.message);
			rl.prompt();
		}	
	
				
	};

	rl.prompt(); 

};

exports.playCmd = rl => {


	
	let score = 0;
	
	let toBeResolved = [];
	
	model.getAll().forEach((quiz, id) => {
	toBeResolved.push(id);
	});
	
	const playOne = () => {
	if(toBeResolved.length===0){
		log('Ya no quedan más preguntas!','yellow'); 
		log('Fin del examen. Número de aciertos','yellow'); 
		biglog(score,'yellow');
		rl.prompt();
	}else{
		let idArray = Math.floor(toBeResolved.length*Math.random());
		let idQ = toBeResolved[idArray];
		
		toBeResolved.splice(idArray,1);
		
		let quizi = model.getByIndex(idQ);
		rl.question(` ${colorize(quizi.question, 'red')}${colorize('?','red')}`,answer => {
			if(quizi.answer.toLowerCase() === answer.toLowerCase().trim()){
				score++;
				log(`\n correcta - Llevas acertadas ${score} preguntas \n `, 'magenta');
				
				playOne();
			}else{
				log(` ${colorize('incorrecta - Fin del examen. Has acertado:', 'magenta')} `);
				biglog(score,'blue');
				rl.prompt();
			};

		});

	}
}

playOne();

};



exports.deleteCmd = (rl,id) => {
	

	validateId(id)
	.then(id => models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	}); 

};

exports.editCmd = (rl,id) => {
	
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id= ${id}.`);
		}

		process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
		return makeQuestion(rl, 'Introduzca la pregunta:')
		.then(q => {
			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
			return makeQuestion(rl, 'Introduzca la respuesta')
			.then(a => {
				quiz.question = q;
				quiz.answer = a;
				return quiz;
			});
		});
	})
	.then(quiz => {
		return quiz.save();
	})
	.then(quiz => {
		log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
		})
	.catch(Sequelize.ValidationError, error => {
		 errorlog('El quiz es erróneo:');
		 error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error =>{
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
	


};

exports.creditsCmd = rl => {
	log("Autor de la práctica");
    log("Jorge Fernández Macho")
    rl.prompt();
};