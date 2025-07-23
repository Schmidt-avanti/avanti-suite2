import NewUseCaseList from "./NewUseCaseList";
import NewUseCaseDetail from "./NewUseCaseDetail";
import NewUseCaseForm from "./NewUseCaseForm";

<Route path="new-use-cases" element={<NewUseCaseList />} />
<Route path="new-use-cases/new" element={<NewUseCaseForm />} />
<Route path="new-use-cases/:id" element={<NewUseCaseDetail />} /> 