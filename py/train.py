import json
import argparse
import sys
import random
from pathlib import Path
import spacy
from spacy.util import minibatch, compounding


class DocumentClass:
    def __init__(self, title, text, annotations):
        self.title = title
        self.text = text
        self.annotations = annotations


class AnnotationClass:
    def __init__(self, label, start, end, content):
        self.range = {'startPosition': start, 'endPosition': end}
        self.content = content
        self.label = label


def data_converting(raw_data):
    data = json.loads(raw_data)
    final_data = []; label_set = set()
    for d in data:
        if d['annotations'].count != 0:
            temp = {'entities':[]}
            for anno in d['annotations']:
                temp['entities'].append((int(anno['range']['startPosition']), int(anno['range']['endPosition']), anno['label']))
                label_set.add(anno['label'])
            final_data.append((d['text'],temp))
    return final_data, label_set


def main(raw_data, n_iter, model):
    # """Set up the pipeline and entity recognizer, and train the new entity."""
    random.seed(0)
    train_data, label_set = data_converting(raw_data)
    print("Training with: ", train_data)
    if model is not None:
        nlp = spacy.load(model)  # load existing spaCy model
        print("Loaded model '%s'" % model)
        sys.stdout.flush()
    else:
        nlp = spacy.blank("en")  # create blank Language class
        print("Created blank 'en' model")
    # Add entity recognizer to model if it's not in the pipeline
    # nlp.create_pipe works for built-ins that are registered with spaCy
    if "ner" not in nlp.pipe_names:
        ner = nlp.create_pipe("ner")
        nlp.add_pipe(ner)
    # otherwise, get it, so we can add labels to it
    else:
        ner = nlp.get_pipe("ner")
    for l in label_set:
        ner.add_label(l)

    # Adding extraneous labels shouldn't mess anything up
    if model is None:
        optimizer = nlp.begin_training()
    else:
        optimizer = nlp.resume_training()
    move_names = list(ner.move_names)
    # get names of other pipes to disable them during training
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
    with nlp.disable_pipes(*other_pipes):  # only train NER
        sizes = compounding(1.0, 4.0, 1.001)
        # batch up the examples using spaCy's minibatch
        for itn in range(n_iter):
            random.shuffle(train_data)
            batches = minibatch(train_data, size=sizes)
            losses = {}
            for batch in batches:
                texts, annotations = zip(*batch)
                nlp.update(texts, annotations, sgd=optimizer, drop=0.35, losses=losses)
                print("Losses", losses)
                sys.stdout.flush()

    # Update model
    output_dir = Path(model)
    nlp.to_disk(output_dir)
    print("Saved model to: ", output_dir)
    sys.stdout.flush()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--raw_data',
        help="Path to the data directory."
    )

    parser.add_argument(
        '--n_iter',
        type=int,
        help="Number of iterations to run."
    )
    parser.add_argument(
        '--model',
        help="Path to current model."
    )

    args = parser.parse_args()
    print("args parsed")
    print(args)
    sys.stdout.flush()

    main(args.raw_data, args.n_iter, args.model)
