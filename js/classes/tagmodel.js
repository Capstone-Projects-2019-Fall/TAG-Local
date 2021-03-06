//jshint esversion: 6

class TagModel {
  constructor() {
    this.currentDoc = null;
    this.openDocs = [];
    this.currentCategory = null;
    this.categories = [];
    this.currentModel = "";
    this.projectPath = null;
  }

  // ----- documents ----- //
  addDoc(doc) {
    console.log("Adding document: '" + doc.title + "'");
    if (this.docIndex(doc.title) !== -1) {
      console.log("File already uploaded for: '" + doc.title + "'\n");
      return false;
    }
    this.openDocs.push(doc);
    return true;
  }

  setCurrentDoc(name) {
    console.log("Set current document to: '" + name + "'");
    this.currentDoc = this.openDocs.find(doc => doc.title === name);
  }

  docIndex(name) {
    for (let index = 0; index < this.openDocs.length; index++) {
      if (this.openDocs[index].title === name) {
        return index;
      }
    }
    return -1;
  }

  deleteDoc(docTitle) {
    this.openDocs = this.openDocs.filter(function (doc) {
      return doc.title !== docTitle;
    });
    this.currentDoc = this.openDocs[0];
  }



  // ----- text ----- //
  getContent(start, end = null) {
    return end == null ?
      this.currentDoc.text.substring(start - 1, start)
      :
      this.currentDoc.text.substring(start, end);
  }




  // ----- annotations ----- //
  addAnnotation(range, category) {
    //validate annotation first, throw error if dumbo
    let content = this.getContent(range.startPosition, range.endPosition);
    let annotationToAdd = new Annotation(range, content, category);
    console.log("Adding annotation: '" + annotationToAdd.content + "' to: [" + category + "]");
    return this.currentDoc.sortedPush(annotationToAdd);
  }

  removeAnnotation(annotation) {
    console.log("Removing annotation: '" + annotation.content + "' from [" + this.currentCategory + "]");
    this.currentDoc.updateAnnotationList(annotation);
  }

  removeAnnotationByRange(range) {
    console.log("Removing part of annotation: " + this.currentDoc.text.substring(range.startPosition, range.endPosition));
    this.currentDoc.deleteByRange(range, this.currentCategory);
  }

  removeAnnotationByIndex(index) {
    console.log("Removing annotation: '" + this.currentDoc.annotations[index].content + "' from [" + this.currentDoc.annotations[index].label + "]");
    this.currentDoc.deleteAnnotationByIndex(index);
  }




  // ----- Categories ----- //
  addCategory(name, color) {
    let newCategory = new Category(name, color);
    this.categories.push(newCategory);
    console.log("Added category: [" + newCategory.name + "] to the TagModel");
  }

  categoryIndex(name) {
    for (let index = 0; index < this.categories.length; index++) {
      if (this.categories[index].name === name) {
        return index;
      }
    }
    return -1;
  }

  renameCategory(newName) {
    // update category name of each annotation
    let currentCategory = this.currentCategory;
    this.openDocs.forEach(function (doc) {
      doc.annotations.forEach(function (annotation) {
        if (annotation.label === currentCategory) {
          annotation.label = newName;
        }
      });
    });

    //then update the label name in the category list
    this.categories.find(category => category.name === this.currentCategory).name = newName;
    console.log("Relabeled category: [" + this.currentCategory + "] to [" + newName + "]");
    this.currentCategory = newName;
  }

  deleteCategory() {
    let categoryToDelete = this.currentCategory;
    this.openDocs.forEach(function (doc) {
      doc.annotations = doc.annotations.filter(function (annotation) {
        return annotation.label !== categoryToDelete;
      });
    });
    this.categories.splice(this.categories.indexOf(this.categories.find(category => category.name === this.currentCategory)), 1);
    if (this.categories.length > 0) {
      this.currentCategory = this.categories[0].name;
    } else {
      this.currentCategory = null;
    }
  }




  // ----- color ----- //
  changeColor(color) {
    // update color in category list
    this.categories.find(category => category.name === this.currentCategory).color = color;
  }

  getColor(labelName) {
    return this.categories.find(category => category.name === labelName).color;
  }




  // ----- export ----- //
  jsonifyData(isAllDocuments) {
    return (isAllDocuments
      ?
      JSON.stringify(this.openDocs)
      :
      JSON.stringify([this.currentDoc]));
  }

  getAsZip(){
    var zip = new JSZip();
    this.openDocs.forEach(function(doc){
      let title = doc.title + ".json";
      zip.file(title, JSON.stringify(doc));
      console.log("Added " + title + " to zip");
    });
    return zip;
  }
}
