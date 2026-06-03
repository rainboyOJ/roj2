export interface GradeViewModel {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface ClassViewModel {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface DictionaryServices {
  listGrades(): Promise<GradeViewModel[]>;
  createGrade(input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<GradeViewModel>;
  updateGrade(id: string, input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<void>;
  listClasses(): Promise<ClassViewModel[]>;
  listActiveClasses(): Promise<ClassViewModel[]>;
  createClass(input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<ClassViewModel>;
  updateClass(id: string, input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<void>;
}
