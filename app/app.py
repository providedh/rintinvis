import json

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO


import itertools
import functools
import re
import pickle

from pathlib import Path

import math

import pandas as pd                                            
import json

from iteration_utilities import flatten
from collections import Counter
import random
import rantanplan

# from rantanplan.core import get_scansion

INCREMENT_UPDATE_NUMBER = 5

class RTPLManager:
	
	def __init__ (self):
		self.__poems_df__ = pd.read_json(data_path / 'poems.json')
		self.__poems_df__ = self.__poems_df__.drop(306)
		self.__poems_df__['index'] = self.__poems_df__.index

		self.__books_df__ = self.__poems_df__.groupby(by=['book'], as_index=False).size().reset_index()

		# print(self.__poems_df__.describe())

		# self.__scansion__ = get_scansion(self.__current_poem__)
	
	def get_books_list(self):
		return self.__books_df__.to_json(orient='records')
	
	def get_poems_df(self):
		return self.__poems_df__

	def get_scansion(self, collection_id, poem_id):
		return rantanplan.core.get_scansion(self.__poems_df__.at[0,'body'], 
							rhyme_analysis=True, 
							pos_output=True,
							always_return_rhyme=True)
	
	def get_scansion_for_text(self, text):
		scansion = rantanplan.core.get_scansion(text, 
											rhyme_analysis=True,
											# pos_output=True,
											always_return_rhyme=True)
		lengths = [item['rhythm']['length'] for item in scansion]
		return {
			'scansion_data' : scansion,
			'poem_structure': scansion[0]['structure'],
			'lengths': lengths,
			'n_verses': len(lengths)
		}
		
data_path = Path(__file__).resolve().parent.parent / 'data'
static_path = Path(__file__).resolve().parent / 'static' / 'dist'
print('data path: ' + str(data_path))
print('static path: ' + str(static_path))


app = Flask(__name__, static_folder=str(static_path))
CORS(app)
socketio = SocketIO(app, cors_allowed_origins='*')


manager = RTPLManager()

	
@app.route("/")
def index():
	return app.send_static_file('index.html')

@app.route("/get_collection_books/")
def get_collection_books():
	return manager.get_books_list()

@app.route("/get_scansion/")
def get_scansion():
	return jsonify(manager.get_scansion(0, 0))

@app.route("/get_scansions/<collection_id>")
def get_scansions(collection_id):
	scansion = manager.get_scansion()
	response = jsonify(scansion)
	return response

#Progressive/Incremental
@socketio.on('get_scansions')
def handle_custom_message(data):
    # print('starting to get scansions: ' + str(data))
	print('starting to get scansions')
	next_update = []
	n_updates = 0
	for poem_index, poem_data in manager.get_poems_df().iterrows():
		poem_scansion = manager.get_scansion_for_text(poem_data['body'])
		poem_scansion.update({
			'poem_index': poem_index, 
			'book': poem_data['book'], 
			'title': poem_data['title']
		})
		next_update.append(poem_scansion)
		if len(next_update) == INCREMENT_UPDATE_NUMBER:
			socketio.emit('scansion_update', data=next_update)
			next_update = []
			n_updates += 1 
			if n_updates == 2:
				break
		


if __name__ == "__main__":
	app.run(host="localhost", port=5000, debug=True)


